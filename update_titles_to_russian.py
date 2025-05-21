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

# Карта транслитерации -> русское название
# Добавьте сюда соответствия для ваших страниц
title_mapping = {
    # Места
    'Stariy Zabroshenniy Zamok Prividenie': 'Старый Заброшенный Замок (Пристанище "Привидений")',
    'Vechnotsvetie Korolevstvo': 'Королевство Вечноцветие',
    'Volshebniy Les': 'Волшебный Лес',
    'Ognennaya Gora Zamok Torona': 'Огненная Гора (Замок Торона)',
    'Zacharovanniy Les Bashnya Ruperta': 'Зачарованный Лес (Башня Руперта)',
    'Podvodniy Mir Okean': 'Подводный Мир (Океан)',
    'Podzemelie Vechnotsvetiya': 'Подземелье Вечноцветия',
    'Pylayushie Gory Vulkany': 'Пылающие Горы (Вулканы)',
    'Saharnaya Polyana': 'Сахарная Поляна',
    'Chudo Moll': 'Чудо-Молл',
    'Oblachnoe Korolevstvo': 'Облачное Королевство',
    'Opolovoe Korolevstvo': 'Королевство Ополовое',
    'Park Attraktsionov Chudesnaya Karusel': 'Парк Аттракционов "Чудесная Карусель"',
    'Pauchiy Park': 'Паучий Парк',
    'Beskonechniy Labirint S Dveryu V Mir Fey': 'Бесконечный Лабиринт с Дверью в Мир Фей',
    'Fantaziya Strana': 'Страна Фантазия',
    'Labirint Zabytyh Znaniy': 'Лабиринт Забытых Знаний',
    'Lunnoe Ozero': 'Лунное Озеро',
    'Mir Kotikov': 'Мир Котиков',
    'Volshebnaya Bolnitsa': 'Волшебная Больница',
    'Zapretniy Les': 'Запретный Лес',
    
    # Главные герои
    'Cvetochek': 'Цветочек',
    'Toron': 'Торон',
    'Rupert': 'Руперт',
    
    # Отношения
    'Cvetochek Toron Rupert': 'Взаимоотношения Цветочка, Торона и Руперта',
    'Cvetochek I Roditeli': 'Цветочек и родители',
    'Cvetochek I Siam': 'Цветочек и его брат Сиам',
    
    # Родственники
    'Siam Brat Cvetochka': 'Сиам (брат Цветочка)',
    'Iskorka Sestra Torona': 'Искорка (сестра Торона)',
    'Liliya I Oduvanchik': 'Лилия и Одуванчик (родители Цветочка)',
    
    # Шаблоны
    'Template Plot Tvist': 'Шаблон Сюжетного Поворота',
    'Template Cute Zubastiki': 'Шаблон "Милые Зубастики"',
    
    # Описание мира
    'Vechnotsvetie Obschee': 'Общее Описание Вечноцветия',
    'Distance': 'Расстояния в мире Вечноцветия',
    'Magic System Overview': 'Обзор Магической Системы',
    'Notable Artifacts': 'Значимые Артефакты',
    
    # Злодеи
    'Tenebris': 'Тенебрис (Повелитель Тьмы)',
    'Baba Yaga': 'Баба-Яга',
    'Knyaz Koshmarov': 'Князь Кошмаров',
    'Kolyuchaya Vetv': 'Колючая Ветвь',
    'Ludvig': 'Людвиг (Темный Маг)',
    'Mrachnus': 'Мрачнус',
    'Spidermag': 'Спайдермаг (Колдун-Паук)',
    'Sumrak': 'Сумрак',
    'Bukvoed': 'Буквоед',
    'Doktor Shpritz': 'Доктор Шприц',
    'Doktor Yascher': 'Доктор Ящер',
    'Hmuroomrak': 'Хмуроомрак',
    'Kleshnyak': 'Клешняк',
    
    # Друзья и союзники
    'Sova Travnitsa': 'Сова-Травница',
    'Tkach Pauk': 'Ткач-Паук',
    'Trolli S Zelenymi Ushami': 'Тролли с Зелеными Ушами',
    'Vilkins Igrushka': 'Вилкинс (Живая Игрушка)',
    'Vozdushnye Elfy': 'Воздушные Эльфы',
    'Mudriy Kuznechik': 'Мудрый Кузнечик',
    'Muravi Velikany': 'Муравьи-Великаны',
    'Plamya Vechnosti': 'Пламя Вечности',
    'Polli Popugaychik': 'Полли Попугайчик',
    'Pushinka Hranitel Snov': 'Пушинка (Хранитель Снов)',
    'Rokki Pescherniy Monstr': 'Рокки (Пещерный Монстр)',
    'Saharnye Elfy': 'Сахарные Эльфы',
    'Lunnaya Griva Edinorog': 'Лунная Грива (Единорог)',
    'Lunniy Vals Edinorog': 'Лунный Вальс (Единорог)',
    'Malchik Prividenie': 'Мальчик-Привидение',
    'Mudraya Kapa Kapibara': 'Мудрая Капа (Капибара)',
    'Mudriy Dub': 'Мудрый Дуб',
    'Korol Kotbert Mudriy': 'Король Котберт Мудрый',
    'Koroleva Malinka': 'Королева Малинка',
    'Koroleva Zubastikov': 'Королева Зубастиков',
    'Kroliki Pushok Ushastik Hvostik': 'Кролики: Пушок, Ушастик и Хвостик',
    'Longi Dinozavr': 'Лонги (Динозавр)',
    'Luchik Feya': 'Лучик (Фея)',
    'Drakon Vulkan': 'Дракон Вулкан',
    'Iskrolyot Drakon': 'Искролёт (Дракон)',
    'Kapitan Flint Prizrak': 'Капитан Флинт (Призрак)',
    'Kapitan Nemo': 'Капитан Немо',
    'Kolyuchka Ezhik': 'Колючка (Ёжик)',
    'Komarik Hihi': 'Комарик Хи-хи',
    'Aliy Klyuvik Ptenets': 'Алый Клювик (Птенец)',
    'Chelovek Pauk Matryoshka': 'Человек-Паук Матрёшка',
    'Devochka Koroleva Fantaziya': 'Девочка-Королева Фантазия',
    'Domovyonok Kuzya': 'Домовёнок Кузя'
}

# Получение списка всех страниц
def get_all_pages():
    query = """
    query {
      pages {
        list {
          id
          path
          title
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
        
        return data['data']['pages']['list']
    
    except Exception as e:
        print(f"Ошибка при получении списка страниц:", str(e))
        return []

# Получение содержимого страницы по ID
def get_page_content(page_id):
    query = """
    query GetPage($id: Int!) {
      pages {
        single(id: $id) {
          content
          description
          editor
          isPrivate
          isPublished
          locale
          tags {
            id
            tag
            title
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

# Функция для обновления заголовка страницы с сохранением содержимого
def update_page_title(page_id, current_title, new_title):
    # Получаем текущее содержимое и настройки страницы
    page_data = get_page_content(page_id)
    if not page_data:
        print(f"Не удалось получить содержимое страницы с ID {page_id}")
        return False
    
    # Извлекаем теги (строки, а не ID)
    tags = []
    if page_data['tags']:
        tags = [tag['tag'] for tag in page_data['tags']]
    
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
        'id': page_id,
        'content': page_data['content'],
        'description': page_data['description'] or "",
        'editor': page_data['editor'],
        'isPrivate': page_data['isPrivate'],
        'isPublished': page_data['isPublished'],
        'locale': page_data['locale'],
        'tags': tags,
        'title': new_title
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
            print(f"Ошибка при обновлении заголовка {current_title}:", response_data['errors'])
            return False
        
        # Проверка результата операции
        result = response_data['data']['pages']['update']['responseResult']
        if result['succeeded']:
            print(f"Заголовок страницы успешно обновлен: {current_title} -> {new_title}")
            return True
        else:
            print(f"Ошибка при обновлении заголовка {current_title}:", result['message'])
            return False
    
    except Exception as e:
        print(f"Ошибка при выполнении запроса для {current_title}:", str(e))
        return False

# Определение русского названия по пути страницы
def get_russian_title_from_path(path):
    # Извлекаем базовое имя страницы из пути
    parts = path.split('/')
    base_name = parts[-1]
    
    # Преобразуем snake_case в Title Case для поиска в mapping
    words = base_name.split('_')
    title_case = ' '.join(word.capitalize() for word in words)
    
    # Ищем соответствие в словаре
    return title_mapping.get(title_case)

# Основная функция для обновления заголовков
def update_titles_to_russian():
    print('Начинаем обновление заголовков на русский язык...')
    
    # Получаем список всех страниц
    pages = get_all_pages()
    
    success_count = 0
    fail_count = 0
    skipped_count = 0
    
    for page in pages:
        page_id = page['id']
        current_title = page['title']
        path = page['path']
        
        # Ищем новое русское название
        if current_title in title_mapping:
            new_title = title_mapping[current_title]
        else:
            # Если нет точного соответствия, пробуем найти по пути
            new_title = get_russian_title_from_path(path)
        
        # Если нашли соответствие, обновляем заголовок
        if new_title and new_title != current_title:
            print(f"Обновление: {current_title} -> {new_title}")
            success = update_page_title(page_id, current_title, new_title)
            
            # Делаем паузу между запросами для предотвращения перегрузки API
            time.sleep(0.5)
            
            if success:
                success_count += 1
            else:
                fail_count += 1
        else:
            print(f"Пропуск страницы (соответствие не найдено): {current_title} (путь: {path})")
            skipped_count += 1
    
    print(f"\nОбновление заголовков завершено!")
    print(f"Успешно обновлено: {success_count}")
    print(f"Не удалось обновить: {fail_count}")
    print(f"Пропущено: {skipped_count}")

# Запуск программы
if __name__ == "__main__":
    update_titles_to_russian() 