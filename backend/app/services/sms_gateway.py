import logging
import math
from typing import Any, Dict, Iterable, List, Optional, Tuple

import httpx
import phonenumbers
from phonenumbers import NumberParseException

from app.config import (
    SMS_API_KEY,
    SMS_API_URL,
    SMS_PROVIDER,
    SMS_SENDER_ID,
    SMS_SANDBOX,
    SMS_TIMEOUT_SECONDS,
    SMS_RETRIES,
)
from app.utils.phone import normalize_phone

logger = logging.getLogger("sms_gateway")

DEFAULT_RATE_PER_SMS = 0.035
SUPPORTED_PROVIDERS = ["sandbox", "termii", "smsleopard", "africala", "orange"]


class SmsSendResult:
    def __init__(
        self,
        success: bool,
        provider: str,
        total_cost: float = 0.0,
        messages: Optional[List[Dict[str, Any]]] = None,
        provider_response: Optional[Any] = None,
        error: Optional[str] = None,
    ):
        self.success = success
        self.provider = provider
        self.total_cost = total_cost
        self.messages = messages or []
        self.provider_response = provider_response
        self.error = error

    def to_dict(self) -> Dict[str, Any]:
        return {
            "success": self.success,
            "provider": self.provider,
            "total_cost": self.total_cost,
            "messages": self.messages,
            "provider_response": self.provider_response,
            "error": self.error,
        }


class BaseSmsProvider:
    name: str
    supports_bulk: bool = False

    def __init__(self, api_key: str, api_url: str, sender_id: str):
        self.api_key = api_key
        self.api_url = api_url
        self.sender_id = sender_id
        self.http_timeout = SMS_TIMEOUT_SECONDS
        self.retries = SMS_RETRIES

    async def send(self, recipient: str, message: str, sms_count: int) -> SmsSendResult:
        raise NotImplementedError()

    async def send_bulk(
        self, recipients: Iterable[str], message: str, sms_count: int
    ) -> SmsSendResult:
        if self.supports_bulk:
            return await self._send_bulk(recipients, message, sms_count)

        results = []
        total_cost = 0.0
        for recipient in recipients:
            result = await self.send(recipient, message, sms_count)
            results.append(result.to_dict())
            if result.success:
                total_cost += result.total_cost
        success = all(r["success"] for r in results)
        return SmsSendResult(
            success=success,
            provider=self.name,
            total_cost=total_cost,
            messages=results,
        )

    async def _send_bulk(self, recipients: Iterable[str], message: str, sms_count: int) -> SmsSendResult:
        raise NotImplementedError()

    async def _request(
        self,
        method: str,
        url: str,
        json: Optional[Dict[str, Any]] = None,
        params: Optional[Dict[str, Any]] = None,
    ) -> httpx.Response:
        async with httpx.AsyncClient(timeout=self.http_timeout) as client:
            for attempt in range(1, self.retries + 2):
                try:
                    response = await client.request(method, url, json=json, params=params)
                    response.raise_for_status()
                    return response
                except Exception as exc:
                    logger.warning(
                        "SMS provider %s request failed (attempt %s/%s): %s",
                        self.name,
                        attempt,
                        self.retries + 1,
                        exc,
                    )
                    if attempt >= self.retries + 1:
                        raise


class SandboxSmsProvider(BaseSmsProvider):
    name = "sandbox"
    supports_bulk = True

    def __init__(self, api_key: str, api_url: str, sender_id: str):
        super().__init__(api_key, api_url, sender_id)

    async def send(self, recipient: str, message: str, sms_count: int) -> SmsSendResult:
        logger.info("[SANDBOX] SMS to %s: %s", recipient, message)
        response = {
            "status": "sandbox",
            "to": recipient,
            "message": message,
            "sender_id": self.sender_id,
        }
        return SmsSendResult(
            success=True,
            provider=self.name,
            total_cost=sms_count * DEFAULT_RATE_PER_SMS,
            messages=[{"to": recipient, "status": "sandbox"}],
            provider_response=response,
        )

    async def _send_bulk(self, recipients: Iterable[str], message: str, sms_count: int) -> SmsSendResult:
        logger.info("[SANDBOX] Bulk SMS to %s recipients", len(list(recipients)))
        recipients_list = list(recipients)
        response = {
            "status": "sandbox_bulk",
            "count": len(recipients_list),
        }
        messages = [{"to": phone, "status": "sandbox"} for phone in recipients_list]
        return SmsSendResult(
            success=True,
            provider=self.name,
            total_cost=len(recipients_list) * sms_count * DEFAULT_RATE_PER_SMS,
            messages=messages,
            provider_response=response,
        )


class TermiiProvider(BaseSmsProvider):
    name = "termii"
    supports_bulk = True

    async def send(self, recipient: str, message: str, sms_count: int) -> SmsSendResult:
        payload = {
            "to": recipient,
            "from": self.sender_id,
            "sms": message,
            "api_key": self.api_key,
            "type": "plain",
        }
        url = f"{self.api_url.rstrip('/')}/sms/send"
        response = await self._request("POST", url, json=payload)
        data = response.json()
        success = data.get("status") in ("success", "sent")
        return SmsSendResult(
            success=success,
            provider=self.name,
            total_cost=sms_count * DEFAULT_RATE_PER_SMS,
            messages=[{"to": recipient, "status": data.get("status") or "unknown"}],
            provider_response=data,
            error=None if success else data,
        )

    async def _send_bulk(self, recipients: Iterable[str], message: str, sms_count: int) -> SmsSendResult:
        payload = {
            "to": ",".join(recipients),
            "from": self.sender_id,
            "sms": message,
            "api_key": self.api_key,
            "type": "plain",
        }
        url = f"{self.api_url.rstrip('/')}/sms/send"
        response = await self._request("POST", url, json=payload)
        data = response.json()
        success = data.get("status") in ("success", "sent")
        messages = [{"to": phone, "status": data.get("status") or "unknown"} for phone in recipients]
        return SmsSendResult(
            success=success,
            provider=self.name,
            total_cost=len(list(recipients)) * sms_count * DEFAULT_RATE_PER_SMS,
            messages=messages,
            provider_response=data,
            error=None if success else data,
        )


class AfricalaProvider(BaseSmsProvider):
    name = "africala"
    supports_bulk = True

    async def send(self, recipient: str, message: str, sms_count: int) -> SmsSendResult:
        payload = {
            "to": recipient,
            "sender": self.sender_id,
            "message": message,
            "apikey": self.api_key,
        }
        url = f"{self.api_url.rstrip('/')}/send"
        response = await self._request("POST", url, json=payload)
        data = response.json()
        success = str(data.get("status", "")).lower() in ("ok", "success")
        return SmsSendResult(
            success=success,
            provider=self.name,
            total_cost=sms_count * DEFAULT_RATE_PER_SMS,
            messages=[{"to": recipient, "status": data.get("status") or "unknown"}],
            provider_response=data,
            error=None if success else data,
        )

    async def _send_bulk(self, recipients: Iterable[str], message: str, sms_count: int) -> SmsSendResult:
        payload = {
            "to": ",".join(recipients),
            "sender": self.sender_id,
            "message": message,
            "apikey": self.api_key,
        }
        url = f"{self.api_url.rstrip('/')}/send"
        response = await self._request("POST", url, json=payload)
        data = response.json()
        success = str(data.get("status", "")).lower() in ("ok", "success")
        messages = [{"to": phone, "status": data.get("status") or "unknown"} for phone in recipients]
        return SmsSendResult(
            success=success,
            provider=self.name,
            total_cost=len(list(recipients)) * sms_count * DEFAULT_RATE_PER_SMS,
            messages=messages,
            provider_response=data,
            error=None if success else data,
        )


class SmsLeopardProvider(BaseSmsProvider):
    name = "smsleopard"
    supports_bulk = True

    async def send(self, recipient: str, message: str, sms_count: int) -> SmsSendResult:
        payload = {
            "msisdn": recipient,
            "message": message,
            "sender": self.sender_id,
            "apikey": self.api_key,
        }
        url = f"{self.api_url.rstrip('/')}/send"
        response = await self._request("POST", url, json=payload)
        data = response.json()
        success = response.status_code == 200 and data.get("status") in ("success", "sent")
        return SmsSendResult(
            success=success,
            provider=self.name,
            total_cost=sms_count * DEFAULT_RATE_PER_SMS,
            messages=[{"to": recipient, "status": data.get("status") or "unknown"}],
            provider_response=data,
            error=None if success else data,
        )

    async def _send_bulk(self, recipients: Iterable[str], message: str, sms_count: int) -> SmsSendResult:
        payload = {
            "msisdn": ",".join(recipients),
            "message": message,
            "sender": self.sender_id,
            "apikey": self.api_key,
        }
        url = f"{self.api_url.rstrip('/')}/send"
        response = await self._request("POST", url, json=payload)
        data = response.json()
        success = response.status_code == 200 and data.get("status") in ("success", "sent")
        messages = [{"to": phone, "status": data.get("status") or "unknown"} for phone in recipients]
        return SmsSendResult(
            success=success,
            provider=self.name,
            total_cost=len(list(recipients)) * sms_count * DEFAULT_RATE_PER_SMS,
            messages=messages,
            provider_response=data,
            error=None if success else data,
        )


class OrangeProvider(BaseSmsProvider):
    name = "orange"
    supports_bulk = True

    async def send(self, recipient: str, message: str, sms_count: int) -> SmsSendResult:
        payload = {
            "to": recipient,
            "message": message,
            "sender": self.sender_id,
            "api_key": self.api_key,
        }
        url = f"{self.api_url.rstrip('/')}/sms/send"
        response = await self._request("POST", url, json=payload)
        data = response.json()
        success = response.status_code == 200 and data.get("status") in ("success", "sent")
        return SmsSendResult(
            success=success,
            provider=self.name,
            total_cost=sms_count * DEFAULT_RATE_PER_SMS,
            messages=[{"to": recipient, "status": data.get("status") or "unknown"}],
            provider_response=data,
            error=None if success else data,
        )

    async def _send_bulk(self, recipients: Iterable[str], message: str, sms_count: int) -> SmsSendResult:
        payload = {
            "to": ",".join(recipients),
            "message": message,
            "sender": self.sender_id,
            "api_key": self.api_key,
        }
        url = f"{self.api_url.rstrip('/')}/sms/send"
        response = await self._request("POST", url, json=payload)
        data = response.json()
        success = response.status_code == 200 and data.get("status") in ("success", "sent")
        messages = [{"to": phone, "status": data.get("status") or "unknown"} for phone in recipients]
        return SmsSendResult(
            success=success,
            provider=self.name,
            total_cost=len(list(recipients)) * sms_count * DEFAULT_RATE_PER_SMS,
            messages=messages,
            provider_response=data,
            error=None if success else data,
        )


PROVIDER_MAP = {
    "sandbox": SandboxSmsProvider,
    "termii": TermiiProvider,
    "africala": AfricalaProvider,
    "smsleopard": SmsLeopardProvider,
    "orange": OrangeProvider,
}


class SmsGateway:
    def __init__(self) -> None:
        provider_name = SMS_PROVIDER.lower() if SMS_PROVIDER else "sandbox"
        if SMS_SANDBOX:
            provider_name = "sandbox"
        provider_cls = PROVIDER_MAP.get(provider_name, SandboxSmsProvider)
        self.provider = provider_cls(SMS_API_KEY, SMS_API_URL, SMS_SENDER_ID)
        self.provider_name = provider_name

    @staticmethod
    def normalize_phone_number(phone: str, default_region: str = "CM") -> Optional[str]:
        if not phone:
            return None

        normalized = normalize_phone(phone, default_country_code=default_region)
        try:
            parsed = phonenumbers.parse(normalized, None)
            if not phonenumbers.is_possible_number(parsed) or not phonenumbers.is_valid_number(parsed):
                return None
            return phonenumbers.format_number(parsed, phonenumbers.PhoneNumberFormat.E164)
        except NumberParseException:
            return None

    @staticmethod
    def compute_segments(message: str, encoding: str = "GSM") -> int:
        if encoding and encoding.upper() != "GSM":
            limit = 70
        else:
            limit = 160
        return math.ceil(max(1, len(message)) / limit)

    @staticmethod
    def estimate_cost(message: str, recipient_count: int, encoding: str = "GSM") -> float:
        segments = SmsGateway.compute_segments(message, encoding=encoding)
        return segments * recipient_count * DEFAULT_RATE_PER_SMS

    async def send_single(
        self,
        to: str,
        message: str,
        sender_id: Optional[str] = None,
        encoding: str = "GSM",
    ) -> SmsSendResult:
        recipient = self.normalize_phone_number(to)
        if not recipient:
            error = f"Numéro invalide : {to}"
            logger.error(error)
            return SmsSendResult(success=False, provider=self.provider_name, error=error)

        sms_count = self.compute_segments(message, encoding)
        provider = self.provider
        if sender_id:
            provider.sender_id = sender_id

        result = await provider.send(recipient, message, sms_count)
        logger.info(
            "SMS send_single provider=%s to=%s success=%s cost=%.4f",
            provider.name,
            recipient,
            result.success,
            result.total_cost,
        )
        return result

    async def send_bulk(
        self,
        recipients: Iterable[str],
        message: str,
        sender_id: Optional[str] = None,
        encoding: str = "GSM",
    ) -> SmsSendResult:
        normalized: List[str] = []
        invalid_numbers: List[str] = []
        for phone in recipients:
            recipient = self.normalize_phone_number(phone)
            if recipient:
                normalized.append(recipient)
            else:
                invalid_numbers.append(phone)

        if not normalized:
            error = "Aucun numéro valide fourni pour l'envoi SMS."
            logger.error(error)
            return SmsSendResult(success=False, provider=self.provider_name, error=error)

        sms_count = self.compute_segments(message, encoding)
        provider = self.provider
        if sender_id:
            provider.sender_id = sender_id

        result = await provider.send_bulk(normalized, message, sms_count)
        if invalid_numbers:
            logger.warning(
                "SMS bulk: %s numéros invalides ignorés: %s",
                len(invalid_numbers),
                invalid_numbers,
            )
            result.messages.append({
                "invalid_numbers": invalid_numbers,
                "skipped": len(invalid_numbers),
            })

        logger.info(
            "SMS send_bulk provider=%s recipients=%s success=%s cost=%.4f",
            provider.name,
            len(normalized),
            result.success,
            result.total_cost,
        )
        return result


sms_gateway = SmsGateway()
