# Sygalin Connect - Guide de Développement

Guide complet pour développer et déployer localement le projet Sygalin Connect (plateforme SaaS Bulk SMS).

---

## 🏗️ Architecture du Projet

```
Sygalin Connect/
├── backend/              # FastAPI + SQLAlchemy
├── frontend/             # React 18 + Vite + Tailwind
├── scripts/              # Scripts de migration et utilitaires
├── docker-compose.yml    # Orchestration des services
├── Dockerfile            # Image backend
├── Dockerfile.frontend   # Image frontend
├── .env.example          # Variables d'environnement
└── README_DEV.md        # Ce fichier
```

### Services
- **PostgreSQL 16** (db) : Base de données principale
- **Redis 7** (redis) : Caching, sessions, rate limiting
- **FastAPI Backend** (backend) : API REST
- **React Frontend** (frontend) : Interface utilisateur

---

## 📋 Prérequis

### Avant Docker
- **Docker** v20+
- **Docker Compose** v2.10+
- **Git**

### Alternative (sans Docker)
- **Python** 3.13+
- **Node.js** 20+ (LTS)
- **PostgreSQL** 16
- **Redis** 7

---

## 🚀 Démarrage Rapide (avec Docker)

### 1️⃣ Préparation
```bash
# Cloner le projet
git clone <repo>
cd "Bulk SMS"

# Copier la configuration
cp .env.example .env

# Éditer .env si nécessaire
# Dans .env, vérifier :
# - DATABASE_URL=postgresql+psycopg://sygalin:sygalin_pass@db:5432/sygalin_connect
# - REDIS_URL=redis://redis:6379/0
# - SMS_SANDBOX=true (pour tester sans envoyer de vrais SMS)
```

### Préparation Windows (PowerShell)
```powershell
git clone <repo>
cd "Bulk SMS"
Copy-Item .env.example .env
notepad .env
```

### 2️⃣ Construire les images
```bash
docker compose build
```

### 3️⃣ Démarrer les services
```bash
docker compose up -d
```

### Utiliser le script de démarrage
```bash
bash ./scripts/start.sh
```

Vérifier le statut :
```bash
docker compose ps
```

Logs en direct :
```bash
docker compose logs -f backend
```

### 4️⃣ Initialiser la Base de Données

#### Option A : Créer une DB vierge (première fois)
```bash
docker compose exec backend alembic upgrade head
```

#### Option B : Migrer depuis SQLite (données existantes)
```bash
docker compose exec backend python scripts/migrate_from_sqlite.py
```

### 5️⃣ Vérifier l'accès
- **Backend** : http://localhost:8000
  - API docs (Swagger) : http://localhost:8000/docs
  - ReDoc : http://localhost:8000/redoc
- **Frontend** : http://localhost:5173
- **PostgreSQL** : localhost:5432
- **Redis** : localhost:6379

---

## 🛑 Arrêter les services
```bash
docker compose down

# Arrêter ET supprimer les volumes (données perdues)
docker compose down -v
```

---

## 🔧 Développement (avec Docker)

### Lancer le backend en mode développement avec recharger automatique
```bash
docker compose up backend
# Les modifications dans ./backend sont automatiquement rechargées
```

### Lancer le frontend en mode développement
```bash
docker compose up frontend
# Les modifications dans ./frontend sont automatiquement rechargées
```

### Exécuter des commandes dans le container
```bash
# Backend
docker compose exec backend python -c "from app.models import User; print('OK')"

# Frontend
docker compose exec frontend npm list

# Shell bash dans le backend
docker compose exec backend bash
```

---

## 🔨 Développement (sans Docker - Local)

### Backend
```bash
cd backend

# Créer l'environnement virtuel
python -m venv venv

# Activer (Windows)
venv\Scripts\activate
# Activer (macOS/Linux)
source venv/bin/activate

# Installer les dépendances
python -m pip install -r requirements.txt

# Configurer .env
cp .env.example .env
# Éditer backend/.env pour pointer vers PostgreSQL local

# Lancer les migrations
alembic upgrade head

# Démarrer le serveur
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Backend Windows (PowerShell)
```powershell
cd backend
python -m venv venv
venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item ..\.env.example .env
notepad .env
alembic upgrade head
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend
```bash
cd frontend

# Installer les dépendances
npm install

# Configurer .env
cp .env.example .env
# Éditer frontend/.env pour VITE_API_URL=http://localhost:8000/api/v1

# Lancer le dev server
npm run dev
```
```

---

## 📊 Structure de Base de Données

### Tables principales
- `users` : Administrateurs et Clients
- `sms_packs` : Packs de SMS à acheter
- `sender_ids` : Numéros/identifiants d'expédition approuvés
- `contacts` : Contacts des utilisateurs
- `groups` : Groupes de contacts
- `campaigns` : Campagnes SMS
- `messages` : Messages individuels d'une campagne
- `transactions` : Historique d'achat et débit de SMS
- `notifications` : Notifications in-app
- `chat_messages` : Messages de chat entre Admin et Clients

### Migration de données
Voir `scripts/migrate_from_sqlite.py` pour importer les données depuis SQLite.

---

## 🔑 Variables d'Environnement Essentielles

Voir `.env.example` pour une liste complète.

### Backend
```
DATABASE_URL=postgresql+psycopg://user:pass@localhost:5432/dbname
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key
SMS_SANDBOX=true (development)
SMS_PROVIDER=sandbox (development)
```

### Frontend
```
VITE_API_URL=http://localhost:8000/api/v1
```

---

## 🧪 Tests

### Tester l'API
```bash
curl http://localhost:8000/docs

# Ou utiliser Postman/Insomnia avec les routes dans API docs
```

### Tester les migrations
```bash
docker compose exec backend python scripts/migrate_from_sqlite.py
```

### Tester les endpoints SMS
```bash
curl -X POST http://localhost:8000/api/v1/client/sms/test-send \
  -H "Authorization: Bearer <your_token>" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+237612345678", "message": "Test SMS"}'
```

---

## 📈 Logs & Debugging

### Voir les logs backend
```bash
docker compose logs backend

# En continu
docker compose logs -f backend
```

### Voir les logs frontend
```bash
docker compose logs frontend
```

### Voir les logs PostgreSQL
```bash
docker compose logs db
```

### Voir les logs Redis
```bash
docker compose logs redis
```

---

## 🔐 Comptes de test par défaut

### Admin
- Email : `admin@sygalin.com`
- Mot de passe : valeur de `SYGALIN_ADMIN_PASSWORD` dans `.env`

### Client
- Email : `client@example.com`
- Mot de passe : `Client123!`
- SMS Balance : 2500

---

## 📦 Production Checklist

- [ ] `SMS_SANDBOX=false` dans `.env`
- [ ] `SMS_PROVIDER` configuré (termii, africala, etc.)
- [ ] `SMS_API_KEY` configuré
- [ ] `SECRET_KEY` généré aléatoirement
- [ ] `DEBUG=false`
- [ ] Certificats SSL/TLS
- [ ] Sauvegardes PostgreSQL activées
- [ ] Monitoring & alertes en place
- [ ] Rate limiting configuré
- [ ] Logs centralisés

---

## 🐛 Troubleshooting

### Port déjà utilisé
```bash
# Trouver le processus
lsof -i :8000

# Ou modifier docker-compose.yml pour utiliser un autre port
# Changez "8000:8000" en "8001:8000"
```

### Base de données non accessible
```bash
# Vérifier que PostgreSQL est bien lancé
docker compose ps db

# Vérifier les logs
docker compose logs db
```

### Redis non accessible
```bash
# Vérifier la connexion
docker compose exec backend redis-cli -h redis ping
```

### Migrations échouées
```bash
# Voir l'état des migrations
docker compose exec backend alembic current

# Réinitialiser
docker compose exec backend alembic stamp head
```

---

## 📚 Références

- [FastAPI Docs](https://fastapi.tiangolo.com)
- [SQLAlchemy 2.0](https://docs.sqlalchemy.org/en/20/)
- [React 18](https://react.dev)
- [Docker Compose](https://docs.docker.com/compose/)
- [Alembic](https://alembic.sqlalchemy.org)

---

## 📝 Notes

- Les volumes Docker (`pgdata`, `redisdata`) sont persistants entre les redémarrages.
- Les modifications dans `backend/` et `frontend/` sont reflétées en temps réel (hot reload).
- Ne commitez **pas** `.env` dans Git (utiliser `.env.example`).

---

Dernière mise à jour : Mai 2026
