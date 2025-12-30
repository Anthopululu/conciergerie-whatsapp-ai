#!/bin/bash

# Script pour démarrer l'application dans GitHub Codespaces
# Usage: ./start-codespace.sh

echo "🚀 Démarrage de l'application dans Codespaces"
echo "============================================="

# Vérifier que nous sommes dans le bon répertoire
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis le répertoire racine du projet"
    exit 1
fi

# Installer les dépendances si nécessaire
echo "📦 Vérification des dépendances..."
if [ ! -d "backend/node_modules" ]; then
    echo "   Installation des dépendances backend..."
    cd backend && npm install && cd ..
fi

if [ ! -d "frontend/node_modules" ]; then
    echo "   Installation des dépendances frontend..."
    cd frontend && npm install && cd ..
fi

if [ ! -d "frontend-admin/node_modules" ]; then
    echo "   Installation des dépendances frontend-admin..."
    cd frontend-admin && npm install && cd ..
fi

# Démarrer le backend
echo "🔧 Démarrage du backend..."
cd backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
echo "   Backend démarré (PID: $BACKEND_PID)"
cd ..

# Attendre un peu que le backend démarre
sleep 3

# Démarrer le frontend conciergerie
echo "🔧 Démarrage du frontend conciergerie..."
cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
echo "   Frontend conciergerie démarré (PID: $FRONTEND_PID)"
cd ..

# Démarrer le frontend admin
echo "🔧 Démarrage du frontend admin..."
cd frontend-admin
npm run dev > ../frontend-admin.log 2>&1 &
ADMIN_PID=$!
echo "   Frontend admin démarré (PID: $ADMIN_PID)"
cd ..

echo ""
echo "✅ Application démarrée !"
echo ""
echo "📍 URLs :"
echo "   - Backend API: http://localhost:3000"
echo "   - Frontend Conciergerie: http://localhost:5173"
echo "   - Frontend Admin: http://localhost:5174"
echo ""
echo "📋 Logs :"
echo "   - Backend: tail -f backend.log"
echo "   - Frontend: tail -f frontend.log"
echo "   - Admin: tail -f frontend-admin.log"
echo ""
echo "🛑 Pour arrêter :"
echo "   kill $BACKEND_PID $FRONTEND_PID $ADMIN_PID"
echo ""

