#!/usr/bin/env python3
"""
Script per ottenere il Refresh Token di YouTube OAuth 2.0
Una volta ottenuto, aggiungilo al file .env come EXPO_PUBLIC_YOUTUBE_REFRESH_TOKEN
"""

from google_auth_oauthlib.flow import InstalledAppFlow
import json
import sys

SCOPES = ['https://www.googleapis.com/auth/youtube.readonly']

def get_refresh_token():
    try:
        # Carica le credenziali dal file client_secret.json
        flow = InstalledAppFlow.from_client_secrets_file(
            'client_secret.json',
            SCOPES
        )
        
        print("🌐 Apertura browser per autenticazione...")
        print("📝 Autorizza l'app ad accedere al tuo account YouTube")
        print("")
        
        creds = flow.run_local_server(port=0)
        
        if creds.refresh_token:
            print("\n" + "="*60)
            print("✅ REFRESH TOKEN OTTENUTO CON SUCCESSO!")
            print("="*60)
            print("\nAggiungi questa riga al file .env:\n")
            print(f"EXPO_PUBLIC_YOUTUBE_REFRESH_TOKEN={creds.refresh_token}")
            print("\n" + "="*60)
            print("\n⚠️ IMPORTANTE:")
            print("• Il refresh token è permanente (fino a quando non viene revocato)")
            print("• Non condividere questo token pubblicamente")
            print("• Il file .env è già in .gitignore per sicurezza")
            print("\n")
        else:
            print("\n⚠️ ATTENZIONE: Nessun refresh token ricevuto!")
            print("Potrebbe essere necessario autorizzare nuovamente l'app.")
            sys.exit(1)
            
    except FileNotFoundError:
        print("\n❌ ERRORE: File 'client_secret.json' non trovato!")
        print("\nCome ottenerlo:")
        print("1. Vai su https://console.cloud.google.com/")
        print("2. Credentials > OAuth 2.0 Client ID")
        print("3. Clicca sul tuo Client ID")
        print("4. Clicca 'Download JSON'")
        print("5. Rinomina il file in 'client_secret.json'")
        print("6. Mettilo nella stessa cartella di questo script")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ ERRORE: {e}")
        sys.exit(1)

if __name__ == '__main__':
    get_refresh_token()

