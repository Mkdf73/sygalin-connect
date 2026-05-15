# SMS Campaign Integration - Test & Validation Guide

## 🎯 Objectif
Valider l'intégration complète de la passerelle SMS dans le flux de création et d'envoi de campagnes.

---

## ✅ Checklist Pré-Test

Avant de commencer, vérifiez que tous les services sont actifs :

```bash
docker compose ps
```

Résultat attendu :
- `db` → UP
- `redis` → UP  
- `backend` → UP
- `frontend` → UP

Vérifiez les logs du backend :
```bash
docker compose logs backend | tail -20
```

Cherchez : `"Compte admin Sygalin créé"` ou similaire.

---

## 🔑 Comptes de Test Pré-créés

### Admin Sygalin
```
Email: admin@sygalin.com
Mot de passe: Admin@2026
```

### Client Test
```
Email: client@test.com
Mot de passe: Client@123
```

> **Note** : Le compte client est auto-créé lors de la première inscription. Utilisez l'admin pour approuver les Sender IDs.

---

## 🧪 Scénarios de Test

### Scénario 1 : Test API Directe SMS (Endpoint de Test)

Envoyez un SMS de test directement via l'endpoint `/api/v1/client/sms/test-send`.

#### Curl
```bash
curl -X POST http://localhost:8000/api/v1/client/sms/test-send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <TOKEN_CLIENT>" \
  -d '{
    "phone": "+237123456789",
    "message": "Test SMS depuis Sygalin Connect",
    "sender_id": "<SENDER_ID_VALIDE>"
  }'
```

#### Réponse Attendue (Sandbox)
```json
{
  "success": true,
  "provider": "sandbox",
  "total_cost": 0.035,
  "messages": [
    {
      "to": "+237123456789",
      "status": "sandbox"
    }
  ],
  "provider_response": {
    "status": "sandbox",
    "to": "+237123456789",
    "message": "Test SMS depuis Sygalin Connect",
    "sender_id": "SYGALIN"
  }
}
```

#### Via Postman/Insomnia
1. Créer une nouvelle requête POST
2. URL : `http://localhost:8000/api/v1/client/sms/test-send`
3. En-têtes :
   - `Authorization: Bearer <TOKEN_CLIENT>`
   - `Content-Type: application/json`
4. Body (JSON raw) :
   ```json
   {
     "phone": "+237123456789",
     "message": "Hello from Sygalin",
     "sender_id": "YOUR_SENDER_ID"
   }
   ```

---

### Scénario 2 : Création et Envoi de Campagne

Testez le flux complet : création de campagne → déduction SMS → envoi immédiat.

#### Étape 1 : Importer des Contacts

```bash
curl -X POST http://localhost:8000/api/v1/client/contacts/batch \
  -H "Authorization: Bearer <TOKEN_CLIENT>" \
  -H "Content-Type: application/json" \
  -d '{
    "contacts": [
      {
        "phone": "+237123456789",
        "name": "Client A",
        "email": "client_a@example.com"
      },
      {
        "phone": "+237234567890",
        "name": "Client B",
        "email": "client_b@example.com"
      },
      {
        "phone": "+237345678901",
        "name": "Client C",
        "email": "client_c@example.com"
      }
    ]
  }'
```

Réponse :
```json
{
  "created": 3,
  "duplicates": 0
}
```

#### Étape 2 : Créer une Campagne

```bash
curl -X POST http://localhost:8000/api/v1/client/campaigns \
  -H "Authorization: Bearer <TOKEN_CLIENT>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Campaign 1",
    "message_content": "Bonjour! Ceci est un message de test de Sygalin Connect.",
    "sender_id": "<SENDER_ID_APPROUVE>",
    "contact_ids": ["<ID_CONTACT_1>", "<ID_CONTACT_2>", "<ID_CONTACT_3>"],
    "group_ids": [],
    "encoding": "GSM",
    "is_scheduled": false
  }'
```

Réponse Attendue :
```json
{
  "id": "campaign_uuid_1",
  "name": "Test Campaign 1",
  "message_content": "Bonjour! Ceci est un message de test de Sygalin Connect.",
  "sender_id": "SYGALIN",
  "user_id": "client_uuid",
  "encoding": "GSM",
  "total_recipients": 3,
  "sent_count": 0,
  "delivered_count": 0,
  "failed_count": 0,
  "sms_per_message": 1,
  "total_sms_used": 3,
  "status": "sending",
  "is_scheduled": false,
  "scheduled_at": null,
  "completed_at": null,
  "provider_name": null,
  "provider_response": null,
  "created_at": "2026-05-11T10:00:00.000000"
}
```

**Vérifications** :
- ✅ `status` = `"sending"` (pas `"draft"` — cela veut dire que la passerelle est appelée)
- ✅ `total_sms_used` = `3` (nombre de destinataires × SMS par message)
- ✅ `total_recipients` = `3`

#### Étape 3 : Vérifier l'État de la Campagne

Attendez 1-2 secondes (le temps que la tâche en arrière-plan s'exécute), puis :

```bash
curl -X GET http://localhost:8000/api/v1/client/campaigns/<campaign_id> \
  -H "Authorization: Bearer <TOKEN_CLIENT>"
```

Réponse Attendue (après traitement) :
```json
{
  "id": "campaign_uuid_1",
  "name": "Test Campaign 1",
  "status": "completed",
  "sent_count": 3,
  "delivered_count": 3,
  "failed_count": 0,
  "provider_name": "sandbox",
  "provider_response": "{\"status\": \"sandbox_bulk\", \"count\": 3}",
  "completed_at": "2026-05-11T10:00:02.500000",
  ...
}
```

**Vérifications** :
- ✅ `status` = `"completed"`
- ✅ `sent_count` + `delivered_count` + `failed_count` = `total_recipients` (3)
- ✅ `provider_name` = `"sandbox"`
- ✅ `provider_response` contient une réponse JSON

#### Étape 4 : Consulter les Détails des Messages

```bash
curl -X GET http://localhost:8000/api/v1/client/campaigns/<campaign_id>/messages \
  -H "Authorization: Bearer <TOKEN_CLIENT>"
```

Réponse Attendue :
```json
[
  {
    "id": "msg_uuid_1",
    "campaign_id": "campaign_uuid_1",
    "contact_phone": "+237123456789",
    "contact_name": "Client A",
    "status": "sent",
    "external_id": null,
    "error_message": null,
    "provider_response": "{\"to\": \"+237123456789\", \"status\": \"sandbox\"}",
    "sent_at": "2026-05-11T10:00:02.300000",
    "delivered_at": "2026-05-11T10:00:02.300000"
  },
  {
    "id": "msg_uuid_2",
    "campaign_id": "campaign_uuid_1",
    "contact_phone": "+237234567890",
    "contact_name": "Client B",
    "status": "sent",
    "external_id": null,
    "error_message": null,
    "provider_response": "{\"to\": \"+237234567890\", \"status\": \"sandbox\"}",
    "sent_at": "2026-05-11T10:00:02.350000",
    "delivered_at": "2026-05-11T10:00:02.350000"
  },
  ...
]
```

**Vérifications** :
- ✅ Chaque message a `status` = `"sent"` ou `"delivered"`
- ✅ `provider_response` contient la réponse JSON de la passerelle
- ✅ `sent_at` et `delivered_at` sont peuplés
- ✅ Aucun `error_message` (pas d'erreurs)

---

### Scénario 3 : Campagne Programmée

Testez l'envoi différé via le scheduler.

#### Créer une Campagne Programmée

```bash
curl -X POST http://localhost:8000/api/v1/client/campaigns \
  -H "Authorization: Bearer <TOKEN_CLIENT>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Scheduled Campaign Test",
    "message_content": "Message programmé pour dans 2 minutes",
    "sender_id": "<SENDER_ID>",
    "contact_ids": ["<ID_CONTACT_1>"],
    "group_ids": [],
    "encoding": "GSM",
    "is_scheduled": true,
    "scheduled_at": "2026-05-11T10:05:00Z"
  }'
```

Réponse :
```json
{
  "status": "scheduled",
  ...
}
```

#### Vérifier que le Scheduler Exécute l'Envoi

Attendez que `scheduled_at` soit passé, puis vérifiez :

```bash
curl -X GET http://localhost:8000/api/v1/client/campaigns/<campaign_id> \
  -H "Authorization: Bearer <TOKEN_CLIENT>"
```

Après le passage du créneau `scheduled_at` (typiquement dans 1-2 min + latence du scheduler), l'état doit être `"completed"`.

---

### Scénario 4 : Vérifier la Déduction de SMS

#### Étape 1 : Vérifier le Solde Initial

```bash
curl -X GET http://localhost:8000/api/v1/client/balance \
  -H "Authorization: Bearer <TOKEN_CLIENT>"
```

Réponse :
```json
{
  "sms_balance": 1000,
  "email": "client@test.com"
}
```

#### Étape 2 : Créer une Campagne de 10 SMS

```bash
curl -X POST http://localhost:8000/api/v1/client/campaigns \
  -H "Authorization: Bearer <TOKEN_CLIENT>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Deduction",
    "message_content": "Test",
    "sender_id": "<SENDER_ID>",
    "contact_ids": ["id1", "id2", "id3", "id4", "id5", "id6", "id7", "id8", "id9", "id10"],
    "group_ids": [],
    "encoding": "GSM",
    "is_scheduled": false
  }'
```

#### Étape 3 : Vérifier le Nouveau Solde

```bash
curl -X GET http://localhost:8000/api/v1/client/balance \
  -H "Authorization: Bearer <TOKEN_CLIENT>"
```

Réponse Attendue :
```json
{
  "sms_balance": 990,
  "email": "client@test.com"
}
```

**Vérification** :
- ✅ `1000 - 10 = 990` ✓

---

## 🐛 Debugging

### Vérifier les Logs Backend

```bash
docker compose logs -f backend
```

Cherchez les mentions de :
- `sms_gateway`
- `send_bulk`
- `process_campaign_async`

### Examiner les Transactions

```bash
curl -X GET http://localhost:8000/api/v1/client/transactions \
  -H "Authorization: Bearer <TOKEN_CLIENT>"
```

Vous devriez voir des entrées de type `CAMPAIGN_DEBIT`.

### Vérifier la Base de Données Directement

```bash
docker compose exec db psql -U sygalin -d sygalin_connect -c "SELECT id, status, provider_name, sent_count, delivered_count, failed_count FROM campaigns ORDER BY created_at DESC LIMIT 5;"
```

Résultat Attendu :
```
                  id                  | status    | provider_name | sent_count | delivered_count | failed_count 
--------------------------------------+-----------+---------------+------------+-----------------+------
 xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx | completed | sandbox       |          3 |               3 |            0
```

### Vérifier les Messages

```bash
docker compose exec db psql -U sygalin -d sygalin_connect -c "SELECT id, contact_phone, status, external_id FROM messages WHERE campaign_id = 'campaign_uuid' ORDER BY created_at;"
```

---

## 📊 Cas de Test - Résumé

| Scénario | Endpoint | Attendu | ✅ |
|----------|----------|---------|-----|
| SMS Test Direct | POST `/client/sms/test-send` | `success=true` | |
| Créer Campagne | POST `/client/campaigns` | `status=sending` | |
| Vérifier Campagne | GET `/client/campaigns/{id}` | `status=completed` | |
| Lister Messages | GET `/client/campaigns/{id}/messages` | Messages avec `provider_response` | |
| Solde SMS | GET `/client/balance` | Solde décrémenté | |
| Campagne Programmée | POST `/client/campaigns` (is_scheduled=true) | `status=scheduled` → `completed` | |

---

## 🔄 Flux Complet Vérifié

```
[Client crée campagne]
        ↓
[Validation: Sender ID approuvé]
        ↓
[Déduction du solde SMS]
        ↓
[Création des Message records en BD]
        ↓
[Status = SENDING]
        ↓
[BackgroundTask déclenche sms_gateway.send_bulk()]
        ↓
[SMS Gateway normalise & valide les numéros]
        ↓
[Appelle le provider (Sandbox en test)]
        ↓
[Reçoit la réponse du provider]
        ↓
[Met à jour chaque Message avec status, external_id, provider_response]
        ↓
[Met à jour la Campaign avec sent_count, delivered_count, failed_count, provider_name, provider_response]
        ↓
[Status = COMPLETED]
        ↓
[Notification envoyée au client]
```

---

## ⚙️ Configuration SMS

### Mode Sandbox (Développement/Test)

```bash
# Dans .env
SMS_SANDBOX=true
SMS_PROVIDER=sandbox
```

Tous les SMS sont simulés sans frais.

### Mode Production (Termii/Africala/etc.)

```bash
# Dans .env
SMS_SANDBOX=false
SMS_PROVIDER=termii
SMS_API_KEY=votre_clé_api
SMS_API_URL=https://api.termii.com
SMS_SENDER_ID=SYGALIN
```

---

## ✨ Résultat Attendu Final

Après les tests :
- ✅ Campagnes créées avec `status=SENDING`
- ✅ Messages envoyés via la passerelle
- ✅ Solde SMS décrémenté correctement
- ✅ `provider_response` stocké en BD pour audit
- ✅ Campagnes programmées exécutées à l'heure
- ✅ Notifications créées pour l'utilisateur
- ✅ Endpoint `/api/v1/client/sms/test-send` fonctionnel

---

## 📝 Notes

- Les tests utilisent le provider **Sandbox** par défaut. Aucun SMS réel n'est envoyé.
- La latence de la tâche en arrière-plan est généralement < 1 sec.
- Les réponses du provider sont stockées dans `provider_response` (texte) pour audit et débogage.
- Les migrations Alembic mettent à jour la BD automatiquement au démarrage.

---

**À tester** : Lancez chaque scénario et cochez la case ✅ quand validé ! 🎉
