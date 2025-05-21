#!/usr/bin/env python3
import requests
import json
import os
import time
import sys
from pathlib import Path

# Конфигурация
API_URL = 'http://localhost:8080/graphql'
API_TOKEN = 'eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJhcGkiOjEsImdycCI6MSwiaWF0IjoxNzQ3ODI3ODM4LCJleHAiOjE3NzkzODU0MzgsImF1ZCI6InVybjp3aWtpLmpzIiwiaXNzIjoidXJuOndpa2kuanMifQ.a7hDtaAK8EXWvTPJYlYHb8AFfuufJy1sIrwh-AWkRPjaYH-VqtTECLOiq_855Pc8xAu3xrmhUvGw_9L_SfuEc6iVCVBBpB-uFmXzFn7BkYHYqdkCXBtpYB56J6Wn7fQo2Bby6LA6RJ699Ti1r8dedZ4urLmYsNnoh-mbmjtZ6gBosrY2P1oQYu3V1PdZ2cX8UvEuUdKA9duq99oDVFTGIdyDO2c5aZ2jQBX2dFzqIkBh2qSes_qIN0iQEBCSpNwJ5BijbpOlQwQTbcvfjWXEcP_2-qFOM40EI9LwqhfOXyhMkQhLPNlSPEAOW3DpNhHtOU6o9z8Y-fBRlqb-b1oPdA'
SOURCE_DIR = os.path.join(os.getcwd())  # Текущая директория

# Директории к тегам
directory_to_tags = {
    'characters/main_heroes': ['персонаж', 'главный герой'],
    'characters/villains': ['персонаж', 'злодей', 'антагонист'],
    'characters/friends_allies': ['персонаж', 'друг', 'союзник'],
    'characters/relatives': ['персонаж', 'родственник', 'родитель', 'семья'],
    'places': ['место', 'локация'],
    'world_description': ['мир', 'описание'],
    'artifacts_and_magic': ['артефакт', 'магия'],
    'journey': ['приключение', 'сюжет'],
    'relationship': ['отношения']
}

# Заголовки для API запросов
headers = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {API_TOKEN}'
}

# Преобразование пути к файлу в Wiki.js-путь
def file_path_to_wiki_path(file_path):
    # Получаем относительный путь от базовой директории
    relative_path = os.path.relpath(file_path, SOURCE_DIR)
    # Заменяем обратные слеши на прямые (для Windows)
    relative_path = relative_path.replace('\\', '/')
    # Удаляем расширение файла
    relative_path = os.path.splitext(relative_path)[0]
    # Добавляем слеш в начале
    return f'/{relative_path}'

# Получение заголовка из имени файла
def get_title_from_filename(file_path):
    # Получаем имя файла без расширения
    base_name = os.path.basename(file_path)
    file_name = os.path.splitext(base_name)[0]
    # Разделяем по подчеркиваниям и делаем каждое слово с заглавной буквы
    return ' '.join(word.capitalize() for word in file_name.split('_'))

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

# Функция для миграции конкретного файла
def migrate_file(file_path):
    try:
        # Чтение содержимого файла
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Получение относительного пути
        relative_path = os.path.relpath(file_path, SOURCE_DIR).replace('\\', '/')
        # Преобразование в путь Wiki.js
        wiki_path = file_path_to_wiki_path(file_path)
        # Получение заголовка из имени файла
        title = get_title_from_filename(file_path)
        
        # Определение тегов на основе директории
        tags = []
        for dir_path, dir_tags in directory_to_tags.items():
            if dir_path in relative_path:
                tags = dir_tags.copy()
                break
        
        print(f"Миграция файла: {relative_path} -> {wiki_path} ({title})")
        # Создание страницы в Wiki.js
        return create_page(title, content, wiki_path, tags)
    
    except Exception as e:
        print(f"Ошибка при миграции файла {file_path}:", str(e))
        return False

# Функция для миграции всех файлов в директории
def migrate_directory(directory_path):
    print(f"Миграция директории: {directory_path}")
    success_count = 0
    fail_count = 0
    
    # Проверка существования директории
    if not os.path.exists(directory_path):
        print(f"Директория не найдена: {directory_path}")
        return 0, 0
    
    # Получаем список всех файлов с расширением .md в директории
    for file_name in os.listdir(directory_path):
        if file_name.endswith('.md'):
            file_path = os.path.join(directory_path, file_name)
            
            # Миграция файла
            success = migrate_file(file_path)
            
            # Делаем паузу между запросами для предотвращения перегрузки API
            time.sleep(1)
            
            if success:
                success_count += 1
            else:
                fail_count += 1
    
    return success_count, fail_count

# Основная функция для миграции недостающего контента
def migrate_additional_content():
    print('Начинаем миграцию дополнительного контента...')
    
    # Директории для миграции
    directories_to_migrate = [
        'characters/villains',
        'characters/relatives',
        'characters/friends_allies'
    ]
    
    total_success = 0
    total_fail = 0
    
    for directory in directories_to_migrate:
        print(f"\nМиграция директории {directory}...")
        success, fail = migrate_directory(directory)
        total_success += success
        total_fail += fail
        print(f"Прогресс по директории {directory}: Успешно: {success}, С ошибками: {fail}")
    
    print(f"\nМиграция дополнительного контента завершена!\nВсего успешно: {total_success}\nВсего с ошибками: {total_fail}")

# Запуск программы
if __name__ == "__main__":
    migrate_additional_content() 