#!/usr/bin/env python3
import requests
import json
import time

# Конфигурация
API_URL = 'http://localhost:8080/graphql'
API_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGkiOjEsImdycCI6MSwiaWF0IjoxNzQ3ODI3ODM4LCJleHAiOjE3NzkzODU0MzgsImF1ZCI6InVybjp3aWtpLmpzIiwiaXNzIjoidXJuOndpa2kuanMifQ.a7hDtaAK8EXWvTPJYlYHb8AFfuufJy1sIrwh-AWkRPjaYH-VqtTECLOiq_855Pc8xAu3xrmhUvGw_9L_SfuEc6iVCVBBpB-uFmXzFn7BkYHYqdkCXBtpYB56J6Wn7fQo2Bby6LA6RJ699Ti1r8dedZ4urLmYsNnoh-mbmjtZ6gBosrY2P1oQYu3V1PdZ2cX8UvEuUdKA9duq99oDVFTGIdyDO2c5aZ2jQBX2dFzqIkBh2qSes_qIN0iQEBCSpNwJ5BijbpOlQwQTbcvfjWXEcP_2-qFOM40EI9LwqhfOXyhMkQhLPNlSPEAOW3DpNhHtOU6o9z8Y-fBRlqb-b1oPdA'

# Заголовки для API запросов
headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {API_TOKEN}'
}

# Функция для получения страницы по ID
def get_page_by_id(page_id):
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
            print(f"Ошибка при получении страницы {page_id}:", data['errors'])
            return None
        
        return data['data']['pages']['single']
    
    except Exception as e:
        print(f"Ошибка при получении страницы {page_id}:", str(e))
        return None

# Функция для получения страницы по пути
def get_page_by_path(path):
    query = """
    query GetPageByPath($path: String!, $locale: String!) {
      pages {
        singleByPath(path: $path, locale: $locale) {
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
        'path': path,
        'locale': 'ru'  # Используем русскую локаль
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
            print(f"Ошибка при получении страницы {path}:", data['errors'])
            return None
        
        return data['data']['pages']['singleByPath']
    
    except Exception as e:
        print(f"Ошибка при получении страницы {path}:", str(e))
        return None

# Функция для обновления страницы
def update_page(page_data, new_content=None, new_title=None):
    if new_content is not None:
        page_data['content'] = new_content
    
    if new_title is not None:
        page_data['title'] = new_title
    
    # Получаем теги для параметра запроса
    tags = [tag['tag'] for tag in page_data['tags']] if page_data['tags'] else []
    
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
    
    variables = {
        'id': page_data['id'],
        'content': page_data['content'],
        'description': page_data['description'] or "",
        'editor': page_data['editor'],
        'isPrivate': page_data['isPrivate'],
        'isPublished': page_data['isPublished'],
        'locale': page_data['locale'],
        'tags': tags,
        'title': page_data['title']
    }
    
    try:
        response = requests.post(
            API_URL,
            headers=headers,
            json={'query': mutation, 'variables': variables}
        )
        
        if response.status_code != 200:
            print(f"Ошибка HTTP {response.status_code}: {response.text}")
            return False
        
        data = response.json()
        if 'errors' in data:
            print(f"Ошибка при обновлении страницы {page_data['title']}:", data['errors'])
            return False
        
        result = data['data']['pages']['update']['responseResult']
        if result['succeeded']:
            print(f"Страница '{page_data['title']}' успешно обновлена")
            return True
        else:
            print(f"Ошибка при обновлении страницы '{page_data['title']}':", result['message'])
            return False
    
    except Exception as e:
        print(f"Ошибка при выполнении запроса для '{page_data['title']}':", str(e))
        return False

# Функция для обновления главной страницы
def update_homepage():
    # Получаем главную страницу
    homepage = get_page_by_path('home')
    if not homepage:
        print("Не удалось получить главную страницу")
        return False
    
    # Создаем новое содержимое для главной страницы
    new_content = """---
title: "Приключения Цветочка, Торона и Руперта"
description: "Приключения в волшебном мире"
tags:
  - главная
created: 2023-12-01T12:00:00.000Z
updated: """ + time.strftime("%Y-%m-%dT%H:%M:%S.000Z") + """
---

# Приключения Цветочка, Торона и Руперта

Этот вики содержит структурированную базу знаний о сказочном мире, персонажах и приключениях котёнка Цветочка, короля драконов Торона и волшебника Руперта.

## Разделы

- [Персонажи](/characters) - Информация о персонажах мира
  - [Главные герои](/characters/main_heroes) - Цветочек, Торон и Руперт
  - [Злодеи](/characters/villains) - Антагонисты и противники
  - [Друзья и союзники](/characters/friends_allies) - Те, кто помогает главным героям
  - [Родственники](/characters/relatives) - Родители, братья, сестры и другие родственники

- [Места](/places) - Локации и карты волшебного мира
  - [Королевство Вечноцветие](/places/vechnotsvetie_korolevstvo)
  - [Волшебный Лес](/places/volshebniy_les)
  - [И многие другие удивительные места...](/places)

- [Отношения](/relationship) - Связи между персонажами

- [Мир](/world_description) - Описание мира Вечноцветия
  - [Общее Описание Вечноцветия](/world_description/vechnotsvetie_obschee)
  - [Обзор Магической Системы](/world_description/magic_system_overview)

- [Артефакты и магия](/artifacts_and_magic) - Волшебные предметы и явления

- [Приключения](/journey) - Истории и шаблоны для приключений
"""
    
    # Обновляем главную страницу
    return update_page(homepage, new_content=new_content)

# Функция для создания новой страницы категории
def create_category_page(path, title, description=""):
    # Подготовка GraphQL запроса
    mutation = """
    mutation CreatePage($content: String!, $description: String!, $editor: String!, $isPrivate: Boolean!, $isPublished: Boolean!, $locale: String!, $path: String!, $tags: [String]!, $title: String!) {
      pages {
        create(
          content: $content
          description: $description
          editor: $editor
          isPrivate: $isPrivate
          isPublished: $isPublished
          locale: $locale
          path: $path
          tags: $tags
          title: $title
        ) {
          responseResult {
            succeeded
            message
            slug
          }
          page {
            id
            path
            title
          }
        }
      }
    }
    """
    
    # Создаем содержимое страницы
    content = f"""---
title: "{title}"
description: "{description}"
tags:
  - категория
created: {time.strftime("%Y-%m-%dT%H:%M:%S.000Z")}
updated: {time.strftime("%Y-%m-%dT%H:%M:%S.000Z")}
---

# {title}

{description}
"""
    
    # Подготовка переменных для запроса
    variables = {
        'content': content,
        'description': description,
        'editor': 'markdown',
        'isPrivate': False,
        'isPublished': True,
        'locale': 'ru',
        'path': path,
        'tags': ['категория'],
        'title': title
    }
    
    # Выполнение запроса
    try:
        response = requests.post(
            API_URL,
            headers=headers,
            json={'query': mutation, 'variables': variables}
        )
        
        if response.status_code != 200:
            print(f"Ошибка HTTP {response.status_code}: {response.text}")
            return False
        
        data = response.json()
        if 'errors' in data:
            print(f"Ошибка при создании страницы '{title}':", data['errors'])
            return False
        
        result = data['data']['pages']['create']['responseResult']
        if result['succeeded']:
            print(f"Страница '{title}' успешно создана по пути '{path}'")
            return True
        else:
            print(f"Ошибка при создании страницы '{title}':", result['message'])
            return False
    
    except Exception as e:
        print(f"Ошибка при выполнении запроса для создания страницы '{title}':", str(e))
        return False

# Функция для переименования раздела relatives
def rename_relatives_section():
    # Пытаемся получить страницу категории родственников
    print("Получение страницы категории родственников...")
    
    # Создаем новую страницу категории, если её нет
    create_category_page(
        path="characters/relatives",
        title="Родственники",
        description="Родители, братья, сестры и другие родственники персонажей"
    )
    
    # Переименовываем все страницы в разделе relatives
    print("Получение списка всех страниц Wiki.js...")
    
    # Получаем все страницы
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
            return False
        
        data = response.json()
        if 'errors' in data:
            print(f"Ошибка при получении списка страниц:", data['errors'])
            return False
        
        pages = data['data']['pages']['list']
        
        # Находим страницы раздела relatives
        relatives_pages = []
        for page in pages:
            if 'characters/relatives/' in page['path']:
                relatives_pages.append(page)
        
        if not relatives_pages:
            print("Страницы в разделе родственников не найдены")
            return False
        
        success_count = 0
        fail_count = 0
        
        # Переименовываем каждую страницу
        for page in relatives_pages:
            page_data = get_page_by_id(page['id'])
            if not page_data:
                print(f"Не удалось получить данные страницы {page['title']}")
                fail_count += 1
                continue
            
            result = update_page(page_data)
            if result:
                success_count += 1
            else:
                fail_count += 1
        
        print(f"Переименование страниц в разделе родственников завершено:")
        print(f"Успешно обновлено: {success_count}")
        print(f"Не удалось обновить: {fail_count}")
        
        return success_count > 0
    
    except Exception as e:
        print(f"Ошибка при получении списка страниц:", str(e))
        return False

# Основная функция
def main():
    print("Начинаем обновление Wiki.js...")
    
    # Обновляем главную страницу
    print("\n1. Обновление главной страницы:")
    if update_homepage():
        print("Главная страница успешно обновлена")
    else:
        print("Не удалось обновить главную страницу")
    
    # Переименовываем раздел relatives
    print("\n2. Создание/переименование раздела родственников:")
    if rename_relatives_section():
        print("Раздел родственников успешно обновлен")
    else:
        print("Возникли проблемы при обновлении раздела родственников")
    
    print("\nОбновление Wiki.js завершено!")

if __name__ == "__main__":
    main() 