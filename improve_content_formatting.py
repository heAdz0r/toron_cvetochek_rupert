#!/usr/bin/env python3
import requests
import json
import os
import time
import re

# Конфигурация
API_URL = 'http://localhost:8080/graphql'
API_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGkiOjEsImdycCI6MSwiaWF0IjoxNzQ3ODI3ODM4LCJleHAiOjE3NzkzODU0MzgsImF1ZCI6InVybjp3aWtpLmpzIiwiaXNzIjoidXJuOndpa2kuanMifQ.a7hDtaAK8EXWvTPJYlYHb8AFfuufJy1sIrwh-AWkRPjaYH-VqtTECLOiq_855Pc8xAu3xrmhUvGw_9L_SfuEc6iVCVBBpB-uFmXzFn7BkYHYqdkCXBtpYB56J6Wn7fQo2Bby6LA6RJ699Ti1r8dedZ4urLmYsNnoh-mbmjtZ6gBosrY2P1oQYu3V1PdZ2cX8UvEuUdKA9duq99oDVFTGIdyDO2c5aZ2jQBX2dFzqIkBh2qSes_qIN0iQEBCSpNwJ5BijbpOlQwQTbcvfjWXEcP_2-qFOM40EI9LwqhfOXyhMkQhLPNlSPEAOW3DpNhHtOU6o9z8Y-fBRlqb-b1oPdA'

# Заголовки для API запросов
headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {API_TOKEN}'
}

# Функция для получения всех страниц
def get_all_pages():
    query = """
    query GetAllPages {
      pages {
        list {
          id
          title
          path
          description
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
            print(f"Ошибка при получении страниц:", data['errors'])
            return None
        
        return data['data']['pages']['list']
    
    except Exception as e:
        print(f"Ошибка при получении страниц:", str(e))
        return None

# Функция для получения подробной информации о странице
def get_page_details(page_id):
    query = """
    query GetPage($id: Int!) {
      pages {
        single(id: $id) {
          id
          title
          path
          content
          description
          isPrivate
          isPublished
          locale
          editor
          tags {
            id
            tag
          }
        }
      }
    }
    """
    
    variables = {
        'id': page_id
    }
    
    try:
        response = requests.post(
            API_URL,
            headers=headers,
            json={'query': query, 'variables': variables}
        )
        
        if response.status_code != 200:
            print(f"Ошибка HTTP {response.status_code}: {response.text}")
            return None
        
        data = response.json()
        if 'errors' in data:
            print(f"Ошибка при получении содержимого страницы {page_id}:", data['errors'])
            return None
        
        return data['data']['pages']['single']
    
    except Exception as e:
        print(f"Ошибка при получении содержимого страницы {page_id}:", str(e))
        return None

# Функция для обновления содержимого страницы
def update_page_content(page_id, title):
    # Получаем подробную информацию о странице
    page = get_page_details(page_id)
    if not page:
        print(f"Не удалось получить содержимое страницы '{title}'")
        return False
    
    # Проверяем, есть ли уже YAML-заголовок
    if page['content'].startswith('---'):
        print(f"Страница '{title}' уже имеет YAML-заголовок. Пропускаем.")
        return False
    
    # Получаем теги для добавления в YAML-заголовок
    tags = [tag['tag'] for tag in page['tags']] if page['tags'] else []
    
    # Создаем YAML-заголовок
    yaml_header = "---\n"
    yaml_header += f"title: \"{page['title']}\"\n"
    if page['description'] and page['description'].strip():
        yaml_header += f"description: \"{page['description']}\"\n"
    if tags:
        yaml_header += "tags:\n"
        for tag in tags:
            yaml_header += f"  - {tag}\n"
    yaml_header += "created: " + time.strftime("%Y-%m-%dT%H:%M:%S.000Z") + "\n"
    yaml_header += "updated: " + time.strftime("%Y-%m-%dT%H:%M:%S.000Z") + "\n"
    yaml_header += "---\n\n"
    
    # Добавляем YAML-заголовок к содержимому
    new_content = yaml_header + page['content']
    
    # Подготовка GraphQL запроса
    mutation = """
    mutation UpdatePage($id: Int!, $content: String!, $description: String!, $editor: String!, $isPrivate: Boolean!, $isPublished: Boolean!, $locale: String!, $tags: [String]!, $title: String!) {
      pages {
        update(
          id: $id
          content: $content
          description: $description
          editor: $editor
          isPrivate: $isPrivate
          isPublished: $isPublished
          locale: $locale
          tags: $tags
          title: $title
        ) {
          responseResult {
            succeeded
            message
          }
        }
      }
    }
    """
    
    # Подготовка переменных для запроса
    variables = {
        'id': page['id'],
        'content': new_content,
        'description': page['description'] or "",
        'editor': page['editor'],
        'isPrivate': page['isPrivate'],
        'isPublished': page['isPublished'],
        'locale': page['locale'],
        'tags': tags,
        'title': page['title']
    }
    
    # Выполнение запроса
    try:
        response = requests.post(
            API_URL,
            headers=headers,
            json={'query': mutation, 'variables': variables}
        )
        
        # Проверка ответа
        if response.status_code != 200:
            print(f"Ошибка HTTP {response.status_code}: {response.text}")
            return False
        
        response_data = response.json()
        
        # Проверка на ошибки GraphQL
        if 'errors' in response_data:
            print(f"Ошибка при обновлении содержимого страницы '{title}':", response_data['errors'])
            return False
        
        # Проверка результата операции
        result = response_data['data']['pages']['update']['responseResult']
        if result['succeeded']:
            print(f"Содержимое страницы '{title}' успешно обновлено")
            return True
        else:
            print(f"Ошибка при обновлении содержимого страницы '{title}':", result['message'])
            return False
    
    except Exception as e:
        print(f"Ошибка при выполнении запроса для '{title}':", str(e))
        return False

# Основная функция
def main():
    print("Начинаем обновление форматирования страниц...")
    
    # Получаем все страницы
    pages = get_all_pages()
    if not pages:
        print("Не удалось получить список страниц")
        return
    
    # Обновляем содержимое каждой страницы
    success_count = 0
    fail_count = 0
    skip_count = 0
    
    for page in pages:
        # Если это корневая страница, пропускаем её
        if page['path'] == 'home':
            print(f"Пропускаем главную страницу: '{page['title']}'")
            skip_count += 1
            continue
        
        # Обновляем содержимое страницы
        if update_page_content(page['id'], page['title']):
            success_count += 1
        else:
            # Если страница уже имеет YAML-заголовок, считаем её пропущенной
            if "уже имеет YAML-заголовок" in f"Страница '{page['title']}' уже имеет YAML-заголовок. Пропускаем.":
                skip_count += 1
            else:
                fail_count += 1
    
    print("\nОбновление форматирования завершено!")
    print(f"Успешно обновлено: {success_count}")
    print(f"Не удалось обновить: {fail_count}")
    print(f"Пропущено: {skip_count}")

if __name__ == "__main__":
    main() 