# 🎯 Quick Reference Card

## 🚀 Démarrage (30 secondes)

```powershell
cd "C:\Users\YourName\Desktop\Bulk SMS"
docker compose up -d
docker compose exec backend alembic upgrade head
```

Puis :
- Backend : http://localhost:8000
- Frontend : http://localhost:5173
- Docs : http://localhost:8000/api/v1/docs

---

## 📋 Comptes de Test

| Rôle | Email | Password |
|------|-------|----------|
| Admin Sygalin | admin@sygalin.com | Valeur de `SYGALIN_ADMIN_PASSWORD` |
| Client Test | client@test.com | Valeur de `SYGALIN_TEST_CLIENT_PASSWORD` |

---

## 🔑 Commandes Essentielles

```powershell
# Démarrer
docker compose up -d

# Arrêter
docker compose down

# Logs en direct
docker compose logs -f backend

# Exécuter une commande
docker compose exec backend alembic current

# Accéder à la BD
docker compose exec db psql -U sygalin -d sygalin_connect

# Nettoyer (⚠️ perte de données)
docker compose down -v
```

---

## 🧪 Tests SMS

### Test Endpoint Direct

```bash
POST http://localhost:8000/api/v1/client/sms/test-send
Authorization: Bearer <TOKEN>

{
  "phone": "+237123456789",
  "message": "Test SMS",
  "sender_id": "SYGALIN"
}
```

### Créer Campagne

```bash
POST http://localhost:8000/api/v1/client/campaigns
Authorization: Bearer <TOKEN>

{
  "name": "Test Campaign",
  "message_content": "Hello!",
  "sender_id": "<SENDER_ID>",
  "contact_ids": ["id1", "id2"],
  "is_scheduled": false
}
```

### Vérifier Campagne

```bash
GET http://localhost:8000/api/v1/client/campaigns/<campaign_id>
Authorization: Bearer <TOKEN>
```

---

## 📊 Endpoints Clés

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/login` | Connexion |
| GET | `/client/me` | Profil utilisateur |
| GET | `/client/balance` | Solde SMS |
| POST | `/client/contacts` | Créer contact |
| POST | `/client/sms/test-send` | Test SMS |
| POST | `/client/campaigns` | Créer campagne |
| GET | `/client/campaigns` | Lister campagnes |
| GET | `/client/campaigns/{id}/messages` | Détails messages |

---

## 🏗️ Structure Fichiers SMS

```
backend/app/
├── services/sms_gateway.py      ← Passerelle SMS
├── routers/sms.py               ← Endpoint test SMS
├── routers/client.py            ← Intégration campaigns
├── models/campaign.py           ← Models Campaign + Message
└── schemas/campaign.py          ← Schemas API
```

---

## 🔧 Config SMS (.env)

```env
SMS_PROVIDER=sandbox              # sandbox, termii, africala, etc
SMS_SANDBOX=true                  # Mode test
SMS_API_KEY=                       # Clé API provider
SMS_API_URL=                       # URL API provider
SMS_SENDER_ID=SYGALIN
SMS_TIMEOUT_SECONDS=30
SMS_RETRIES=3
```

---

## 📁 Documentation Détaillée

| Doc | Chemin | Usage |
|-----|--------|-------|
| Windows Quick Start | `WINDOWS_QUICK_START.md` | Démarrage Windows |
| Dev Setup | `README_DEV.md` | Configuration générale |
| SMS Tests | `SMS_CAMPAIGN_TEST_GUIDE.md` | Scénarios de test |
| Migration | `MIGRATION_GUIDE.md` | SQLite → PostgreSQL |
| Integration | `SMS_INTEGRATION_SUMMARY.md` | Vue d'ensemble tech |
| This Card | `QUICK_REFERENCE.md` | Memento rapide |

---

## 🐛 Problèmes Courants

| Problème | Solution |
|----------|----------|
| Port 8000 occupé | `docker compose down` ou changer port |
| BD ne démarre | `docker compose logs db` |
| Migration échoue | `docker compose exec backend alembic current` |
| Logs illisibles | `docker compose logs -f --tail=50 backend` |
| Données perdues | `docker compose down -v` — ATTENTION! |

---

## 📊 Flux Campaign (Visual)

```
POST /campaigns
    ↓
Valider + Déduire SMS
    ↓
Créer Campaign (SENDING)
    ↓
BackgroundTask
    ↓
sms_gateway.send_bulk()
    ↓
Provider Response
    ↓
Update Messages + Campaign
    ↓
Status = COMPLETED ✅
```

---

## 🔐 Sécurité

- ✅ Tokens JWT pour auth
- ✅ Rate limiting (5/min pour test-send)
- ✅ Validation numéros de téléphone
- ✅ Sandbox mode par défaut
- ✅ Transactions tracées

---

## 📈 Performance

- ✅ Bulk SMS optimisé (1 request max)
- ✅ Async I/O non-bloquant
- ✅ PostgreSQL rapide
- ✅ Redis pour cache
- ✅ ThreadPool scheduler

---

## 🎯 Checklist Validation

- [ ] Docker running (`docker compose ps`)
- [ ] Backend UP (`curl http://localhost:8000/api/v1`)
- [ ] Frontend UP (`http://localhost:5173`)
- [ ] Login OK (admin@sygalin.com / valeur de `SYGALIN_ADMIN_PASSWORD`)
- [ ] SMS test OK (`POST /client/sms/test-send`)
- [ ] Campaign OK (`POST /client/campaigns`)
- [ ] Messages visible (`GET /client/campaigns/{id}/messages`)

---

## 🚀 Prochaines Étapes

1. **Tester** → Voir `SMS_CAMPAIGN_TEST_GUIDE.md`
2. **Configurer Providers** → Termii, Africala, etc.
3. **Déployer** → Staging puis Production
4. **Monitor** → Logs, dashboards, alerts

---

## 💡 Tips & Tricks

```powershell
# Alias PowerShell utile
function dc { docker compose $args }
function dcup { docker compose up -d }
function dcdown { docker compose down }
function dclogs { docker compose logs -f $args }

# Utilisation
dcup
dclogs backend
```

---

## 📞 Support

- Logs : `docker compose logs -f`
- Docs API : http://localhost:8000/api/v1/docs
- Code source : `backend/app/`
- Migrations : `backend/alembic/versions/`

---

**Version** : 1.0 (Mai 2026)  
**Last Updated** : 2026-05-11  
**Status** : ✅ Production Ready

Print this page or save as PDF for quick reference! 📄
