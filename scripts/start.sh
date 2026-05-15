#!/bin/bash
set -e

# Usage: ./scripts/start.sh
# Démarre les services Docker et exécute les migrations.

if [ ! -f .env ]; then
  echo "Erreur : .env introuvable. Copiez .env.example en .env avant de lancer le script."
  exit 1
fi

echo "Construction des images Docker..."
docker compose build

echo "Démarrage des services..."
docker compose up -d

echo "Attente du démarrage de PostgreSQL et Redis..."
sleep 10

echo "Exécution des migrations Alembic..."
docker compose exec backend alembic upgrade head

echo "Projet démarré. Backend sur http://localhost:8000 et frontend sur http://localhost:5173"
