#!/usr/bin/env python3
import requests
import json
import os
import time

# Конфигурация
API_URL = 'http://localhost:8080/graphql'
API_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGkiOjEsImdycCI6MSwiaWF0IjoxNzQ3ODI3ODM4LCJleHAiOjE3NzkzODU0MzgsImF1ZCI6InVybjp3aWtpLmpzIiwiaXNzIjoidXJuOndpa2kuanMifQ.a7hDtaAK8EXWvTPJYlYHb8AFfuufJy1sIrwh-AWkRPjaYH-VqtTECLOiq_855Pc8xAu3xrmhUvGw_9L_SfuEc6iVCVBBpB-uFmXzFn7BkYHYqdkCXBtpYB56J6Wn7fQo2Bby6LA6RJ699Ti1r8dedZ4urLmYsNnoh-mbmjtZ6gBosrY2P1oQYu3V1PdZ2cX8UvEuUdKA9duq99oDVFTGIdyDO2c5aZ2jQBX2dFzqIkBh2qSes_qIN0iQEBCSpNwJ5BijbpOlQwQTbcvfjWXEcP_2-qFOM40EI9LwqhfOXyhMkQhLPNlSPEAOW3DpNhHtOU6o9z8Y-fBRlqb-b1oPdA'
SOURCE_DIR = os.path.join(os.getcwd())

# Теги для различных директорий
directory_to_tags = {
    'world_description': ['мир', 'описание'],
    'places': ['место', 'локация'],
    'journey': ['приключение', 'сюжет'],
    'journey/templates': ['шаблон', 'сюжет']
}

# Заголовки для API запросов
headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {API_TOKEN}'
}

# Функция для создания страницы в Wiki.js
def create_page(title, content, path, tags):
    # Подготовка GraphQL запроса
    mutation = """
    mutation CreatePage($content: String!, $title: String!, $path: String!, $tags: [String]!) {
      pages {
        create(
          content: $content
          description: ""
          editor: "markdown"
          isPrivate: false
          isPublished: true
          locale: "ru"
          path: $path
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
        'content': content,
        'title': title,
        'path': path,
        'tags': tags
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
            print(f"Ошибка при создании страницы {path}:", response_data['errors'])
            return False
        
        # Проверка результата операции
        result = response_data['data']['pages']['create']['responseResult']
        if result['succeeded']:
            print(f"Страница {path} успешно создана!")
            return True
        else:
            print(f"Ошибка при создании {path}:", result['message'])
            return False
    
    except Exception as e:
        print(f"Ошибка при выполнении запроса для {path}:", str(e))
        return False

# Функция для получения списка существующих страниц
def get_existing_pages():
    query = """
    query {
      pages {
        list {
          path
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
            return []
        
        data = response.json()
        if 'errors' in data:
            print(f"Ошибка при получении списка страниц:", data['errors'])
            return []
        
        pages = data['data']['pages']['list']
        return [page['path'] for page in pages]
    
    except Exception as e:
        print(f"Ошибка при получении списка страниц:", str(e))
        return []

# Функция для миграции конкретного файла
def migrate_file(file_path, tags=None):
    try:
        # Если теги не указаны, определяем их по директории
        if tags is None:
            relative_dir = os.path.dirname(os.path.relpath(file_path, SOURCE_DIR))
            tags = directory_to_tags.get(relative_dir, ['документ'])
        
        # Чтение содержимого файла
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Получение относительного пути
        relative_path = os.path.relpath(file_path, SOURCE_DIR).replace('\\', '/')
        
        # Преобразование в путь Wiki.js
        wiki_path = '/' + os.path.splitext(relative_path)[0]
        
        # Получение заголовка из имени файла
        base_name = os.path.basename(file_path)
        file_name = os.path.splitext(base_name)[0]
        title = ' '.join(word.capitalize() for word in file_name.split('_'))
        
        # Проверка, существует ли страница уже
        existing_pages = get_existing_pages()
        if wiki_path in existing_pages:
            print(f"Страница {wiki_path} уже существует, пропускаем...")
            return True
        
        print(f"Миграция файла: {relative_path} -> {wiki_path} ({title})")
        # Создание страницы в Wiki.js
        return create_page(title, content, wiki_path, tags)
    
    except Exception as e:
        print(f"Ошибка при миграции файла {file_path}:", str(e))
        return False

# Функция для миграции всех .md файлов в директории
def migrate_directory(directory_path, tags=None):
    print(f"Миграция директории: {directory_path}")
    success_count = 0
    fail_count = 0
    
    # Проверка существования директории
    if not os.path.exists(directory_path):
        print(f"Директория не найдена: {directory_path}")
        return 0, 0
    
    # Определение тегов по директории, если не указаны явно
    if tags is None:
        rel_dir = os.path.relpath(directory_path, SOURCE_DIR)
        tags = directory_to_tags.get(rel_dir, ['документ'])
    
    # Получаем список всех файлов с расширением .md в директории
    for file_name in os.listdir(directory_path):
        if file_name.endswith('.md'):
            file_path = os.path.join(directory_path, file_name)
            
            # Миграция файла
            success = migrate_file(file_path, tags)
            
            # Делаем паузу между запросами для предотвращения перегрузки API
            time.sleep(1)
            
            if success:
                success_count += 1
            else:
                fail_count += 1
    
    return success_count, fail_count

# Основная функция для миграции оставшегося контента
def migrate_final_content():
    print('Начинаем миграцию оставшегося контента...')
    
    # Сначала мигрируем отдельные файлы
    files_to_migrate = [
        {
            'path': 'world_description/distance.md',
            'tags': ['мир', 'описание', 'дистанция']
        }
    ]
    
    # Директории для полной миграции
    directories_to_migrate = [
        'places'
    ]
    
    total_success = 0
    total_fail = 0
    
    # Миграция отдельных файлов
    for file_info in files_to_migrate:
        file_path = os.path.join(SOURCE_DIR, file_info['path'])
        if not os.path.exists(file_path):
            print(f"Файл не найден: {file_path}")
            total_fail += 1
            continue
        
        success = migrate_file(file_path, file_info['tags'])
        if success:
            total_success += 1
        else:
            total_fail += 1
        
        time.sleep(1)
    
    # Миграция директорий
    for directory in directories_to_migrate:
        dir_path = os.path.join(SOURCE_DIR, directory)
        success, fail = migrate_directory(dir_path)
        total_success += success
        total_fail += fail
        print(f"Прогресс по директории {directory}: Успешно: {success}, С ошибками: {fail}")
    
    print(f"\nМиграция оставшегося контента завершена!\nВсего успешно: {total_success}\nВсего с ошибками: {total_fail}")

# Запуск программы
if __name__ == "__main__":
    migrate_final_content() 