# Migration SQLite → PostgreSQL Guide

## 📋 Prérequis

- ✅ Docker & Docker Compose installés
- ✅ Accès au répertoire du projet
- ✅ Données SQLite existantes (optionnel pour migration)

---

## 🔄 Scénarios de Migration

### Scénario A : Démarrage Propre (Recommandé pour Développement)

Si vous n'avez pas de données existantes ou voulez un démarrage frais.

#### Étapes

**1. Nettoyer les anciens volumes (si ils existent)**
```bash
docker compose down -v
```

**2. Copier la configuration**
```bash
cp .env.example .env
```

**3. Vérifier .env pour PostgreSQL**
```env
DATABASE_URL=postgresql+psycopg://sygalin:sygalin_pass@db:5432/sygalin_connect
REDIS_URL=redis://redis:6379/0
SMS_SANDBOX=true
```

**4. Construire et démarrer les services**
```bash
docker compose build
docker compose up -d
```

**5. Initialiser la base de données**
```bash
docker compose exec backend alembic upgrade head
```

Vérifiez les logs :
```bash
docker compose logs backend | grep -E "(alembic|CREATE TABLE|Compte admin)"
```

**6. Vérifier que tout fonctionne**
```bash
curl http://localhost:8000/api/v1
# Devrait retourner : {"message": "SYGALIN CONNECT API v1.0", "docs": "/docs"}
```

✅ **Démarrage propre terminé !**

---

### Scénario B : Migration depuis SQLite Existant

Si vous avez une base de données SQLite avec des données à préserver.

#### Prérequis

- Fichier SQLite existant : `backend/app.db` (ou chemin dans `.env`)
- Toutes les données doivent être conservées

#### Étapes Détaillées

**1. Arrêter et nettoyer Docker**
```bash
docker compose down -v
```

**2. Préparer la configuration PostgreSQL**
```bash
cp .env.example .env
```

Assurez-vous que `.env` contient :
```env
DATABASE_URL=postgresql+psycopg://sygalin:sygalin_pass@db:5432/sygalin_connect
REDIS_URL=redis://redis:6379/0
```

**3. Construire les images**
```bash
docker compose build
```

**4. Démarrer PostgreSQL et Redis uniquement**
```bash
docker compose up -d db redis
```

Attendez 10-15 secondes que PostgreSQL soit prêt :
```bash
docker compose logs db | tail -5
# Cherchez : "database system is ready to accept connections"
```

**5. Initialiser le schéma PostgreSQL**
```bash
docker compose exec db psql -U sygalin -d sygalin_connect \
  -f /docker-entrypoint-initdb.d/init.sql
```

Ou manuellement :
```bash
docker compose run --rm backend alembic upgrade head
```

**6. Exécuter le script de migration**

Vous avez deux options :

##### Option A : Via Docker (Recommandé)

```bash
docker compose run --rm backend python scripts/migrate_from_sqlite.py
```

Le script :
- ✅ Lit les données de SQLite
- ✅ Les transfère vers PostgreSQL
- ✅ Valide l'intégrité des données
- ✅ Affiche un rapport

**Sortie Attendue** :
```
Lecture SQLite: backend/app.db
Connexion PostgreSQL: postgresql+psycopg://sygalin:***@db:5432/sygalin_connect
[Migration] Utilisateurs: 5 → 5 ✅
[Migration] Contacts: 234 → 234 ✅
[Migration] Campagnes: 12 → 12 ✅
[Migration] Messages: 3400 → 3400 ✅
[Migration] Transactions: 18 → 18 ✅
Migration terminée avec succès!
```

##### Option B : Directement (si backend Python local)

```bash
cd backend
python scripts/migrate_from_sqlite.py
```

**7. Vérifier les données en PostgreSQL**

```bash
# Vérifier le nombre d'utilisateurs
docker compose exec db psql -U sygalin -d sygalin_connect -c \
  "SELECT COUNT(*) as count FROM users;"

# Vérifier les contacts
docker compose exec db psql -U sygalin -d sygalin_connect -c \
  "SELECT COUNT(*) as count FROM contacts;"

# Vérifier les campagnes
docker compose exec db psql -U sygalin -d sygalin_connect -c \
  "SELECT COUNT(*) as count FROM campaigns;"
```

Résultat Attendu :
```
 count
-------
     5

 count
-------
   234

 count
-------
    12
```

**8. Archiver la base SQLite (optionnel)**

```bash
mv backend/app.db backend/app.db.backup
```

**9. Démarrer le backend**

```bash
docker compose up -d backend frontend
```

**10. Vérifier le fonctionnement**

```bash
curl http://localhost:8000/api/v1
curl http://localhost:8000/api/v1/auth/login \
  -X POST \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@sygalin.com", "password": "Admin@2026"}'
```

✅ **Migration SQLite → PostgreSQL terminée !**

---

## 🗄️ Gestion des Volumes Docker

### Afficher les volumes existants

```bash
docker volume ls | grep sygalin
```

### Sauvegarder les données PostgreSQL

```bash
docker compose exec db pg_dump -U sygalin sygalin_connect > backup.sql
```

### Restaurer depuis une sauvegarde

```bash
docker compose up -d db
docker compose exec db psql -U sygalin sygalin_connect < backup.sql
```

---

## 🔍 Troubleshooting

### Erreur : "database does not exist"

```bash
docker compose exec db psql -U sygalin -c "CREATE DATABASE sygalin_connect;"
```

### Erreur : "permission denied" pour PostgreSQL

Vérifier les permissions dans `docker-compose.yml` :
```yaml
environment:
  POSTGRES_USER: sygalin
  POSTGRES_PASSWORD: sygalin_pass
  POSTGRES_DB: sygalin_connect
```

### Les migrations Alembic ne s'appliquent pas

```bash
docker compose exec backend alembic upgrade head
docker compose exec backend alembic current
```

### Erreur : "asyncio.run() cannot be called from a running event loop"

Cela vient souvent d'une mauvaise gestion async. Vérifiez les logs :
```bash
docker compose logs backend | grep -i "event loop"
```

Solution : Redémarrer le backend
```bash
docker compose restart backend
```

---

## 📊 Vérifier l'État de la Migration

### Structure de la Base PostgreSQL

```bash
docker compose exec db psql -U sygalin -d sygalin_connect -c "\dt"
```

Résultat Attendu (tables) :
```
            List of relations
 Schema |       Name        | Type  | Owner
--------+-------------------+-------+--------
 public | campaigns         | table | sygalin
 public | chat_messages     | table | sygalin
 public | contacts          | table | sygalin
 public | contact_group     | table | sygalin
 public | groups            | table | sygalin
 public | messages          | table | sygalin
 public | notifications     | table | sygalin
 public | sender_ids        | table | sygalin
 public | sms_packs         | table | sygalin
 public | transactions      | table | sygalin
 public | users             | table | sygalin
```

### Vérifier les Versions de Migrations

```bash
docker compose exec backend alembic history
```

Résultat Attendu :
```
<base> -> 001_initial (head)
<base> -> 002_add_provider_tracking (head)
```

---

## 🚀 Post-Migration

### 1. Tester les Endpoints Critiques

```bash
# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@sygalin.com", "password": "Admin@2026"}'

# Lister les utilisateurs (admin)
curl http://localhost:8000/api/v1/admin/users \
  -H "Authorization: Bearer <TOKEN>"

# Lister les contacts (client)
curl http://localhost:8000/api/v1/client/contacts \
  -H "Authorization: Bearer <TOKEN>"

# Lister les campagnes (client)
curl http://localhost:8000/api/v1/client/campaigns \
  -H "Authorization: Bearer <TOKEN>"
```

### 2. Vérifier la Performance

PostgreSQL devrait être plus rapide que SQLite pour les requêtes volumineuses :

```bash
# Avant migration : mesurer la latence SQLite
# Après migration : mesurer la latence PostgreSQL

time curl http://localhost:8000/api/v1/client/transactions \
  -H "Authorization: Bearer <TOKEN>"
```

### 3. Monitorer l'Utilisation

```bash
# Espace disque PostgreSQL
docker compose exec db du -sh /var/lib/postgresql/data

# Taille de la base
docker compose exec db psql -U sygalin -d sygalin_connect -c \
  "SELECT pg_size_pretty(pg_database_size('sygalin_connect'));"
```

---

## 🔐 Sécurité Post-Migration

### Changer les Mots de Passe PostgreSQL

```bash
docker compose exec db psql -U sygalin -c \
  "ALTER USER sygalin WITH PASSWORD 'nouveau_mot_de_passe_fort';"
```

### Mettre à jour .env

```bash
# .env
DATABASE_URL=postgresql+psycopg://sygalin:nouveau_mot_de_passe_fort@db:5432/sygalin_connect
```

### Supprimer l'Ancienne Base SQLite

Si tout fonctionne bien et que vous n'avez plus besoin de SQLite :

```bash
rm -f backend/app.db
```

---

## 📋 Checklist Migration

- [ ] Docker & Docker Compose en place
- [ ] `.env` configuré avec DATABASE_URL PostgreSQL
- [ ] `docker compose build` réussi
- [ ] PostgreSQL démarré et accessible
- [ ] Schéma Alembic appliqué (`alembic upgrade head`)
- [ ] Script `migrate_from_sqlite.py` exécuté (si données existantes)
- [ ] Données vérifiées en PostgreSQL (`SELECT COUNT(*)`)
- [ ] Backend et Frontend démarrés
- [ ] Endpoints testés (login, contacts, campagnes)
- [ ] Ancien SQLite archivé ou supprimé
- [ ] ✅ Migration réussie !

---

## 💡 Conseils

- **Backup** : Toujours sauvegarder les données avant migration
- **Staging** : Tester la migration sur un environnement de staging d'abord
- **Alembic** : Les migrations sont versionées ; vous pouvez toujours revenir en arrière avec `alembic downgrade -1`
- **Logs** : Consulter les logs en cas d'erreur : `docker compose logs -f backend`

---

**Besoin d'aide ?** Consultez `README_DEV.md` ou les logs Docker.
