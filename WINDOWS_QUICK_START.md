# Windows - Quick Start Guide

## 🪟 Pour Utilisateurs Windows

Ce guide couvre le démarrage du projet **Sygalin Connect** sur Windows.

---

## 📋 Prérequis Windows

### 1. Docker Desktop pour Windows

Télécharger et installer : https://www.docker.com/products/docker-desktop

**Après installation** :
- Redémarrer Windows
- Ouvrir **PowerShell** en administrateur
- Vérifier :
```powershell
docker --version
docker compose version
```

Résultat attendu :
```
Docker version 26.0.0, build...
Docker Compose version v2.24.0...
```

### 2. Git (optionnel)

Si vous ne l'avez pas :
https://git-scm.com/download/win

---

## 🚀 Démarrage Rapide (5 minutes)

### Étape 1 : Cloner le Projet

Ouvrez **PowerShell** (ou **Command Prompt**) et :

```powershell
# Naviguer vers le Bureau
cd $env:USERPROFILE\Desktop

# Cloner le projet (ou le télécharger en ZIP)
git clone <repo_url>
cd "Bulk SMS"
```

### Étape 2 : Préparer la Configuration

```powershell
# Copier le fichier de configuration
Copy-Item .env.example .env

# Vérifier que .env existe
Get-Content .env | Select-Object -First 10
```

### Étape 3 : Lancer Docker

```powershell
# Construire les images
docker compose build

# Démarrer les services
docker compose up -d

# Attendre 10-15 secondes...

# Vérifier le statut
docker compose ps
```

Résultat attendu :
```
NAME       IMAGE           STATUS      PORTS
db         postgres:16     Up          5432/tcp
redis      redis:7         Up          6379/tcp
backend    sygalin-back    Up          8000/tcp
frontend   sygalin-front   Up          5173/tcp
```

### Étape 4 : Initialiser la BD

```powershell
# Appliquer les migrations
docker compose exec backend alembic upgrade head

# Vérifier les logs
docker compose logs backend | Select-String -Pattern "alembic|Migration|Compte"
```

### Étape 5 : Tester

```powershell
# API backend
Invoke-WebRequest -Uri http://localhost:8000/api/v1

# Vérifier le statut
docker compose ps
```

✅ **C'est prêt !**

- Backend : http://localhost:8000
- Frontend : http://localhost:5173
- Docs API : http://localhost:8000/api/v1/docs
- Swagger : http://localhost:8000/api/v1/redoc

---

## 📝 Commandes PowerShell Courantes

### Démarrer les Services

```powershell
docker compose up -d
```

### Arrêter les Services

```powershell
docker compose down
```

### Voir les Logs

```powershell
# Tous les logs
docker compose logs -f

# Logs backend uniquement
docker compose logs -f backend

# 50 dernières lignes
docker compose logs --tail=50 backend
```

### Exécuter une Commande dans un Container

```powershell
# Dans le backend
docker compose exec backend bash

# Ou directement une commande
docker compose exec backend alembic current
docker compose exec backend python scripts/migrate_from_sqlite.py
```

### Accéder à la BD PostgreSQL

```powershell
docker compose exec db psql -U sygalin -d sygalin_connect
```

Commandes utiles dans psql :
```sql
\dt                    -- Lister les tables
SELECT * FROM users;   -- Voir les utilisateurs
\q                     -- Quitter
```

### Nettoyer les Données

```powershell
# Arrêter et supprimer les volumes (⚠️ Perte de données)
docker compose down -v

# Reconstruire depuis zéro
docker compose build --no-cache
docker compose up -d
```

---

## 🧪 Tester l'API

### Avec PowerShell

```powershell
# Test simple
Invoke-WebRequest -Uri http://localhost:8000/api/v1

# Login
$body = @{
    email = "admin@sygalin.com"
    password = "Admin@2026"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri http://localhost:8000/api/v1/auth/login `
  -Method POST `
  -ContentType "application/json" `
  -Body $body

# Extraire le token
$token = $response.Content | ConvertFrom-Json | Select-Object -ExpandProperty access_token
Write-Host "Token: $token"

# Utiliser le token
Invoke-WebRequest -Uri http://localhost:8000/api/v1/client/me `
  -Headers @{ Authorization = "Bearer $token" }
```

### Avec Postman

1. Télécharger **Postman** : https://www.postman.com/downloads/
2. Nouvelle requête :
   - URL : `http://localhost:8000/api/v1/auth/login`
   - Method : POST
   - Body (JSON) :
     ```json
     {
       "email": "admin@sygalin.com",
       "password": "Admin@2026"
     }
     ```
   - Copier le `access_token` reçu
3. Nouvelle requête :
   - URL : `http://localhost:8000/api/v1/client/me`
   - Method : GET
   - Headers : `Authorization: Bearer <TOKEN>`

### Avec cURL (si installé)

```powershell
# Si cURL n'est pas disponible en PowerShell, utiliser :
curl.exe -X POST http://localhost:8000/api/v1/auth/login `
  -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@sygalin.com\",\"password\":\"Admin@2026\"}'
```

---

## 🎮 Interface Utilisateur

### Frontend

```
http://localhost:5173
```

Comptes de test :
- Admin : admin@sygalin.com / Admin@2026
- Client : client@test.com / Client@123

### Documentation API

```
http://localhost:8000/api/v1/docs          (Swagger)
http://localhost:8000/api/v1/redoc         (ReDoc)
```

---

## 📁 Structure du Projet (Windows)

```
C:\Users\YourUsername\Desktop\Bulk SMS
├── backend/                  # API FastAPI
│   ├── app/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── main.py
│   ├── alembic/             # Migrations BD
│   ├── scripts/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/                # Interface React
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── Dockerfile
├── docker-compose.yml       # Orchestration
├── .env                     # Variables (généré de .env.example)
└── .env.example            # Template
```

---

## 🐛 Troubleshooting Windows

### Erreur : "Docker daemon is not running"

Solution :
1. Ouvrir **Docker Desktop** (from Start Menu)
2. Attendre que le daemon démarre (~30s)
3. Relancer les commandes

### Erreur : "Cannot bind to port 8000"

Le port est déjà utilisé. Options :

**A) Fermer l'application qui l'utilise**
```powershell
# Voir ce qui utilise le port 8000
Get-NetTCPConnection -LocalPort 8000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess
```

**B) Changer le port dans docker-compose.yml**
```yaml
backend:
  ports:
    - "8001:8000"  # Au lieu de 8000:8000
```

### Erreur : "psycopg[binary]" install fails

Utiliser :
```powershell
pip install psycopg[binary] --upgrade
```

Ou :
```powershell
pip install psycopg==3.5.0
```

### Container "backend" redémarre sans cesse

Vérifier les logs :
```powershell
docker compose logs backend -f
```

Cherchez les erreurs de syntax Python ou BD. Corriger le code et relancer :
```powershell
docker compose restart backend
```

---

## 🔄 Mise à Jour du Code

### Après modification du code backend

```powershell
# Reconstruire l'image
docker compose build backend

# Redémarrer
docker compose restart backend

# Vérifier les logs
docker compose logs backend
```

### Après modification du code frontend

Le frontend en Vite recharge automatiquement. Pas besoin de redémarrer.

---

## 📊 Surveillance

### Dashboard Docker Desktop

Ouvrir l'application **Docker Desktop** pour voir :
- Containers actifs
- CPU/Mémoire utilisée
- Logs en temps réel
- Volumes

### Terminal Persistant

```powershell
# Terminal séparé pour voir les logs en direct
docker compose logs -f

# Laissez-le ouvert pendant le développement
```

---

## 🚀 Workflow Développement Typique

### Jour 1 : Première Configuration

```powershell
cd $env:USERPROFILE\Desktop
git clone <repo_url>
cd "Bulk SMS"
Copy-Item .env.example .env

docker compose build
docker compose up -d
docker compose exec backend alembic upgrade head

# Test
Invoke-WebRequest -Uri http://localhost:8000/api/v1
```

### Jours Suivants : Développement

```powershell
cd "C:\Users\YourUsername\Desktop\Bulk SMS"

# Démarrer les services
docker compose up -d

# Voir les logs
docker compose logs -f backend

# Faire vos modifications...
# (Le hot reload fonctionne automatiquement)

# Si besoin de tester des scripts
docker compose exec backend python scripts/migrate_from_sqlite.py

# À la fin
docker compose down
```

### Avant Commit/Push

```powershell
# Vérifier que tout compile
docker compose exec backend python -m py_compile app/models/*.py app/routers/*.py

# Vérifier les migrations
docker compose exec backend alembic current

# Tests
docker compose exec backend pytest tests/ (si vous avez des tests)
```

---

## 💾 Sauvegarde BD PostgreSQL

### Créer une Sauvegarde

```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
docker compose exec db pg_dump -U sygalin sygalin_connect | Out-File -FilePath "backup_$timestamp.sql"
```

### Restaurer une Sauvegarde

```powershell
docker compose up -d db
Get-Content backup_20260511_100000.sql | docker compose exec -T db psql -U sygalin sygalin_connect
```

---

## 📱 Accès Depuis Autre Machine

Votre Windows développe les services. Pour accéder depuis un autre PC sur le réseau :

```
http://<YOUR_WINDOWS_IP>:8000     (Backend)
http://<YOUR_WINDOWS_IP>:5173     (Frontend)
```

Pour trouver votre IP Windows :
```powershell
ipconfig
# Cherchez : "IPv4 Address : 192.168.x.x"
```

⚠️ **Attention** : Vérifier que le firewall Windows autorise les ports.

---

## 📚 Ressources

- Docker Docs : https://docs.docker.com/
- PowerShell Docs : https://learn.microsoft.com/en-us/powershell/
- FastAPI : https://fastapi.tiangolo.com/
- React : https://react.dev/

---

## ✅ Checklist Windows

- [ ] Docker Desktop installé & lancé
- [ ] PowerShell ou Command Prompt ouvert
- [ ] Projet cloné dans C:\Users\...\Desktop\
- [ ] `.env` copié et configuré
- [ ] `docker compose build` réussi
- [ ] `docker compose up -d` lancé
- [ ] Services tous à "UP" (`docker compose ps`)
- [ ] BD initialisée (`alembic upgrade head`)
- [ ] API accessible (http://localhost:8000/api/v1)
- [ ] Frontend accessible (http://localhost:5173)
- [ ] ✅ Prêt à développer !

---

## 🆘 Besoin d'aide?

1. Consulter `README_DEV.md` pour configuration générale
2. Voir `SMS_CAMPAIGN_TEST_GUIDE.md` pour tests SMS
3. Consulter `MIGRATION_GUIDE.md` pour migration BD
4. Vérifier les logs Docker : `docker compose logs`
5. Relancer tout : `docker compose down -v && docker compose up -d`

**Bon développement!** 🚀
