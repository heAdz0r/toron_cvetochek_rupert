#!/usr/bin/env python3
import requests
import json

# Конфигурация
API_URL = 'http://localhost:8080/graphql'
API_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGkiOjEsImdycCI6MSwiaWF0IjoxNzQ3ODI3ODM4LCJleHAiOjE3NzkzODU0MzgsImF1ZCI6InVybjp3aWtpLmpzIiwiaXNzIjoidXJuOndpa2kuanMifQ.a7hDtaAK8EXWvTPJYlYHb8AFfuufJy1sIrwh-AWkRPjaYH-VqtTECLOiq_855Pc8xAu3xrmhUvGw_9L_SfuEc6iVCVBBpB-uFmXzFn7BkYHYqdkCXBtpYB56J6Wn7fQo2Bby6LA6RJ699Ti1r8dedZ4urLmYsNnoh-mbmjtZ6gBosrY2P1oQYu3V1PdZ2cX8UvEuUdKA9duq99oDVFTGIdyDO2c5aZ2jQBX2dFzqIkBh2qSes_qIN0iQEBCSpNwJ5BijbpOlQwQTbcvfjWXEcP_2-qFOM40EI9LwqhfOXyhMkQhLPNlSPEAOW3DpNhHtOU6o9z8Y-fBRlqb-b1oPdA'

# Заголовки для API запросов
headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {API_TOKEN}'
}

# Функция для получения списка всех страниц
def get_all_pages():
    query = """
    query GetAllPages {
      pages {
        list {
          id
          title
          path
          locale
        }
      }
    }
    """
    
    try:
        response = requests.post(
            API_URL,
            headers=headers,
            json={'query': query}
        )
        
        if response.status_code != 200:
            print(f"Ошибка HTTP {response.status_code}: {response.text}")
            return None
        
        data = response.json()
        if 'errors' in data:
            print(f"Ошибка при получении списка страниц:", data['errors'])
            return None
        
        return data['data']['pages']['list']
    
    except Exception as e:
        print(f"Ошибка при получении списка страниц:", str(e))
        return None

# Основная функция
def main():
    print("Получение списка всех страниц Wiki.js...")
    
    pages = get_all_pages()
    if not pages:
        print("Не удалось получить список страниц")
        return
    
    print(f"\nНайдено {len(pages)} страниц:\n")
    print(f"{'ID':<6} | {'Путь':<50} | {'Локаль':<8} | {'Заголовок'}")
    print("-" * 100)
    
    for page in pages:
        print(f"{page['id']:<6} | {page['path']:<50} | {page['locale']:<8} | {page['title']}")
    
    # Поиск страниц, связанных с relatives
    print("\nПоиск страниц, связанных с родственниками:")
    found = False
    for page in pages:
        if 'relat' in page['path'].lower() or 'родств' in page['title'].lower():
            print(f"{page['id']:<6} | {page['path']:<50} | {page['locale']:<8} | {page['title']}")
            found = True
    
    if not found:
        print("Страницы, связанные с родственниками, не найдены")

if __name__ == "__main__":
    main() 