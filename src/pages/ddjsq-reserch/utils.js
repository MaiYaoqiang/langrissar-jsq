import Big from 'big.js';

class BaseEntity {
    constructor() {
        this.logger = BattleLogger.getInstance();
    }

    log(message, type = 'info') {
        this.logger.log(message, {
            heroId: this.name || 'unknown',
            type,
            time: this.globalTime
        });
    }

    findClosestTarget() {
        if (!this.targets.length) return null;

        let closestTarget = null;
        let minDistance = Infinity;

        for (const target of this.targets) {
            if (target.isDead) {
                continue
            }
            const distance = Math.abs(target.position - this.position);
            if (distance < minDistance) {
                minDistance = distance;
                closestTarget = target;
            }
        }
        // 如果没有可攻击目标(可能全都死亡) 需要进行鞭尸 暂时先拿第一个目标 后面会改成拿英雄
        if (!closestTarget) closestTarget = this.targets[this.targets.length-1];

        return closestTarget;
    }
}

class Attack extends BaseEntity {
    constructor({targets, maxHits, hitInterval, initialTime, position, attackSpeed, attacker}) {
        super();
        this.targets = targets; // 目标数组
        this.maxHits = maxHits;
        this.hitInterval = hitInterval;
        this.position = position;
        this.attackSpeed = attackSpeed;
        this.nextHitTime = initialTime;
        this.hitsDone = 0;
        this.lockedTarget = null; // 锁定的攻击目标
        this.attacker = attacker;
        this.name = `${attacker.name}-攻击`; // 添加name属性
    }

    update(globalTime) {
        this.globalTime = globalTime; // 为了让 log 方法能获取到时间
        this.lockedTarget = this.findClosestTarget();

        while (globalTime >= this.nextHitTime && this.hitsDone < this.maxHits) {
            if (!this.lockedTarget || this.lockedTarget.isDead) {
                this.lockedTarget = this.findClosestTarget();
            }

            const damage = this.attacker.damageMap.get(this.lockedTarget.type) || 0;
            this.lockedTarget.health -= damage;
            this.hitsDone++;
            this.nextHitTime += this.hitInterval;

            this.log(
                `对 ${this.lockedTarget.name} 造成第【${this.hitsDone}】次伤害（${damage}），剩余生命值: ${this.lockedTarget.health}`,
                'attack'
            );

            if (this.lockedTarget.health <= 0) {
                this.lockedTarget.isDead = true;
                this.log(
                    `${this.lockedTarget.name} 已阵亡`,
                    'kill'
                );
                break;
            }
        }

        return this.hitsDone < this.maxHits;
    }
}

// 添加日志管理类
export class BattleLogger {
    static instance = null;
    
    constructor() {
        this.logs = new Map(); // 用Map存储不同英雄的日志
        this.globalLogs = []; // 存储全局日志
        this.isEnabled = true;
    }

    static getInstance() {
        if (!BattleLogger.instance) {
            BattleLogger.instance = new BattleLogger();
        }
        return BattleLogger.instance;
    }

    log(message, options = {}) {
        const { 
            heroId = 'global',
            type = 'info',
            time = 0
        } = options;

        const logEntry = {
            time,
            type,
            message,
            timestamp: Date.now()
        };

        // 保存到对应英雄的日志列表
        if (!this.logs.has(heroId)) {
            this.logs.set(heroId, []);
        }
        this.logs.get(heroId).push(logEntry);

        // 同时保存到全局日志
        this.globalLogs.push({
            ...logEntry,
            heroId
        });

        if (this.isEnabled) {
            const timeStr = time ? ` at 时间: ${time}ms` : '';
            const prefix = heroId === 'global' ? '' : `[${heroId}] `;
            console.log(`${prefix}${message}${timeStr}`);
        }
    }

    getHeroLogs(heroId) {
        return this.logs.get(heroId) || [];
    }

    getAllLogs() {
        return this.globalLogs;
    }

    clearLogs() {
        this.logs.clear();
        this.globalLogs = [];
    }

    setEnabled(enabled) {
        this.isEnabled = enabled;
    }

    _filterLogs(logs, filters = {}) {
        const {
            name, // 按名称筛选
            nameMatchMode = 'exact', // 名称匹配模式: 'exact' | 'include'
            timeRange = [], // 时间范围：[startTime, endTime]
            excludeTypes = [], // 要排除的日志类型
            includeTypes = [], // 只包含的日志类型
        } = filters;

        return logs.filter(log => {
            // 名称筛选
            if (name) {
                if (nameMatchMode === 'exact') {
                    // 精确匹配模式
                    if (log.heroId !== name && log.heroId !== `${name}-攻击`) {
                        return false;
                    }
                } else if (nameMatchMode === 'include') {
                    // 包含匹配模式
                    if (!log.heroId.includes(name) && !log.heroId.includes(`${name}-攻击`)) {
                        return false;
                    }
                }
            }

            // 时间范围筛选
            if (timeRange.length === 2) {
                const [start, end] = timeRange;
                if (log.time < start || log.time > end) return false;
            }

            // 日志类型排除
            if (excludeTypes.length > 0) {
                if (excludeTypes.includes(log.type)) return false;
            }

            // 日志类型包含
            if (includeTypes.length > 0) {
                if (!includeTypes.includes(log.type)) return false;
            }

            return true;
        });
    }

    printBattleResult(filters = {}) {
        console.log('\n========== 战斗结果 ==========');
        
        // 按时间排序所有日志
        let sortedLogs = [...this.globalLogs].sort((a, b) => a.time - b.time);
        
        // 应用过滤条件
        sortedLogs = this._filterLogs(sortedLogs, filters);

        // 统计击杀信息
        const kills = sortedLogs.filter(log => log.type === 'kill');
        if (kills.length > 0) {
            console.log('\n【击杀记录】');
            kills.forEach(kill => {
                console.log(`[${kill.time}ms] ${kill.heroId}: ${kill.message}`);
            });
        }

        // 统计伤害信息
        const damages = new Map();
        sortedLogs.filter(log => log.type === 'attack').forEach(attack => {
            const attacker = attack.heroId;
            if (!damages.has(attacker)) {
                damages.set(attacker, {
                    totalDamage: 0,
                    hitCount: 0,
                    targets: new Map() // 新增：记录对每个目标的伤害
                });
            }
            const damageMatch = attack.message.match(/对\s+(.+?)\s+造成第.+?伤害（(\d+)）/);
            if (damageMatch) {
                const [, targetName, damageStr] = damageMatch;
                const damage = parseInt(damageStr);
                const stats = damages.get(attacker);
                
                // 更新总伤害统计
                stats.totalDamage += damage;
                stats.hitCount++;

                // 更新对特定目标的伤害统计
                if (!stats.targets.has(targetName)) {
                    stats.targets.set(targetName, {
                        damage: 0,
                        hits: 0
                    });
                }
                const targetStats = stats.targets.get(targetName);
                targetStats.damage += damage;
                targetStats.hits++;
            }
        });

        if (damages.size > 0) {
            console.log('\n【伤害统计】');
            damages.forEach((stats, attacker) => {
                console.log(`${attacker}:`);
                console.log(`  总伤害: ${stats.totalDamage}`);
                console.log(`  命中次数: ${stats.hitCount}`);
                console.log(`  平均伤害: ${(stats.totalDamage / stats.hitCount).toFixed(1)}`);
                
                // 打印对各个目标的伤害分布
                console.log('  目标伤害分布:');
                stats.targets.forEach((targetStats, targetName) => {
                    console.log(`    ${targetName}: ${targetStats.damage} (${targetStats.hits}次)`);
                });
                console.log('');
            });
        }

        console.log('\n============================');
    }

    printFilteredLogs(filters = {}) {
        console.log('\n========== 过滤后的事件记录 ==========');
        
        // 按时间排序所有日志
        let sortedLogs = [...this.globalLogs].sort((a, b) => a.time - b.time);
        
        // 应用过滤条件
        sortedLogs = this._filterLogs(sortedLogs, filters);

        // 打印过滤后的日志
        sortedLogs.forEach(log => {
            const timeStr = log.time ? `[${log.time}ms]` : '';
            const typeStr = `[${log.type}]`;
            console.log(`${timeStr} ${typeStr} [${log.heroId}] ${log.message}`);
        });

        console.log('\n============================');
    }
}

export class Hero extends BaseEntity {
    static totalDistance = 1200;
    static stageList = [
        "等待移动延迟",
        "移动中",
        "等待咏唱时间",
        "等待准备特效",
        "等待施放时间",
        "发出攻击",
        "收尾结束",
    ];
    static Type ={
        HERO: 1,
        SOLDIER: 2,
    }

    constructor(options) {
        super();
        const {
            name,
            health,
            position,
            speed,
            moveDelay,
            chantTime,
            castTime,
            rangeHitTime,
            attackedTime,
            tailTime,
            attackDistance,
            attackCount,
            maxHits,
            attackAgainWait,
            prepareSpecial,
            attackDirection, // 新增攻击方向字段
            type,
            dyx_sh,
            dsb_sh,
        } = options || {};

        Object.assign(this, {
            name,
            health,
            position,
            moveDelay,
            chantTime,
            castTime,
            rangeHitTime,
            attackedTime,
            tailTime,
            attackDistance,
            attackCount,
            maxHits,
            attackAgainWait,
            prepareSpecial,
            attackDirection: attackDirection || 1, // 默认从左往右
            type,
            dyx_sh,
            dsb_sh,
        });

        this.speed = this._fixSpeed(speed);
        this.attackSpeed = this._fixSpeed(attackedTime);
        this.currentAttackStage = null;
        this.currentAttackCount = 0;
        this.pendingAttacks = [];
        this.isDead = false;
        this.eventList = [];
        this.targets = [];
        this.damageMap = new Map(); // 保存目标和对应的伤害值
        this.moveEnd = null; // 记录实际移动时间
        this.preMoveTime = null;
        this.damageMap.set(Hero.Type.HERO,dyx_sh)
        this.damageMap.set(Hero.Type.SOLDIER,dsb_sh)
    }

    trackEvent(event) {
        this.log(event);
        this.eventList.push(event);
    }

    setTargets(targets) {
        this.targets = targets
    }
    moveTowardsTarget(target) {
        const targetPosition = target.position;
        const moveTime = this.globalTime - (this.preMoveTime || 0);
        this.preMoveTime = this.globalTime;
        // 根据攻击方向和目标位置来决定英雄的移动
        const moveDistance = this.speed * moveTime;
        const direction = this.attackDirection === 1 ? 1 : -1;
        const targetDistance = Math.abs(targetPosition - this.position) || 0;

        if (targetDistance > this.attackDistance) {
            // 英雄还没到攻击距离范围，开始移动
            const newPosition = this.position + direction * moveDistance;
            this.position = direction === 1 ? Math.min(newPosition, targetPosition) : Math.max(newPosition, targetPosition);
            return true; // 继续移动
        }
        return false; // 已经在攻击范围内
    }

    _fixSpeed(speed) {
        const expectAllRunTime = 1200;
        const fixed = expectAllRunTime * 400 / Hero.totalDistance;
        return new Big(speed / fixed).round(2).toNumber();
    }

    _calculateAttackSpeed(attackedTime) {
        return Hero.totalDistance / attackedTime;
    }

    update(globalTime) {
        this.globalTime = globalTime;

        this.pendingAttacks = this.pendingAttacks.filter(attack => attack.update(globalTime));

        if (!this.isNeedUpdate()) {
            return;
        }

        if (!this.currentAttackCount) {
            this.currentAttackCount++;
        }

        const baseTime = (this.moveDelay + this.chantTime + this.prepareSpecial + this.castTime + this.tailTime) * (this.currentAttackCount - 1);
        const moveDelayEnd = this.moveDelay;
        const moveEnd = this.moveEnd || Infinity;
        const chantTimeEnd = baseTime + moveEnd + this.chantTime;
        const prepareSpecialEnd = chantTimeEnd + this.prepareSpecial;
        const castTimeEnd = prepareSpecialEnd + this.castTime;
        const tailTimeEnd = castTimeEnd + this.tailTime;

        // 直接初始化一开始是等待移动延迟
        this.checkAndSetNewStage("等待移动延迟");
        if (globalTime >= moveDelayEnd) {
            this.checkAndSetNewStage("移动中");
            if (!this.moveEnd) {
                const target = this.findClosestTarget();
                // 移动阶段：如果当前攻击距离未到达，则移动
                const isMoving = this.moveTowardsTarget(target);
                if (!isMoving) {
                    this.moveEnd = globalTime; // 记录移动结束时间
                }
            }
        }
        if (globalTime >= moveEnd) {
            this.checkAndSetNewStage("等待咏唱时间");
        }
        if (globalTime >= chantTimeEnd) {
            this.checkAndSetNewStage("等待准备特效");
        }
        if (globalTime >= prepareSpecialEnd) {
            this.checkAndSetNewStage("等待施放时间");
        }
        if (globalTime >= castTimeEnd) {
            if (this.checkAndSetNewStage("发出攻击")) {
                const newAttack = new Attack({
                    targets: this.targets,
                    maxHits: this.maxHits,
                    hitInterval: this.rangeHitTime || 0,
                    initialTime: globalTime,
                    position: this.position,
                    attackSpeed: this.attackSpeed,
                    attacker: this,
                });
                this.pendingAttacks.push(newAttack);
            }
        }
        if (globalTime >= tailTimeEnd) {
            if (this.checkAndSetNewStage("收尾结束")) {
                if (this.currentAttackCount < this.attackCount) {
                    this.currentAttackCount++;
                    this.trackEvent(`${this.name} 准备发起第【${this.currentAttackCount}】次攻击 at 时间: ${globalTime}ms`);
                    this.setNewStage("等待咏唱时间");
                } else if (this.currentAttackCount === this.attackCount) {
                    this.currentAttackCount++;
                    this.trackEvent(`${this.name} 出手结束 at 时间: ${globalTime}ms`);
                }
            }
        }
    }

    setNewStage(newStage) {
        this.currentAttackStage = newStage;
        this.log(`当前阶段: ${this.currentAttackStage}`, 'stage');
    }

    checkAndSetNewStage(newStage, {preCallback, force = false} = {}) {
        let res = false;
        const previousStageIndex = Hero.stageList.indexOf(this.currentAttackStage);
        const newStageIndex = Hero.stageList.indexOf(newStage);
        if (!force) {
            if (newStageIndex > previousStageIndex) {
                res = true;
            }
        } else {
            res = true;
        }
        if (res) {
            preCallback && preCallback();
            this.setNewStage(newStage);
        }
        return res;
    }

    isHasAttack() {
        return this.currentAttackCount <= this.attackCount;
    }

    isNeedUpdate() {
        if (this.pendingAttacks.length !== 0) {
            return true;
        }

        if (!this.isDead && this.isHasAttack()) {
            return true;
        }

        return false;
    }
}

// 添加游戏管理类
export class Game {
    constructor(options = {}) {
        const {
            realTime = true, // 是否使用真实时间
            interval = 16, // 快速模式下的时间间隔(ms)
            maxTime = 4000, // 最大游戏时长
            onGameOver = null, // 游戏结束回调
        } = options;

        this.realTime = realTime;
        this.interval = interval;
        this.maxTime = maxTime;
        this.onGameOver = onGameOver;
        this.reset();
    }

    reset() {
        this.globalTime = 0;
        this.lastTime = null;
        this.animationId = null;
        this.heroList = [];
        this.isRunning = false;
    }

    initHeroes(attackTeam, defendTeam) {
        const {
            hero: attackHero,
            soldier: attackSoldier,
            soldierCount: attackSoldierCount = 10
        } = attackTeam;

        const {
            hero: defendHero,
            soldier: defendSoldier,
            soldierCount: defendSoldierCount = 10
        } = defendTeam;

        // 初始化攻方部队
        const gf = [
            ...Array.from({length: attackSoldierCount}).map((_, index) => {
                const attr = {...attackSoldier};
                attr.name = `攻方士兵${index + 1}`;
                return new Hero(attr);
            }),
            new Hero(attackHero)
        ];

        // 初始化守方部队
        const sf = [
            ...Array.from({length: defendSoldierCount}).map((_, index) => {
                const attr = {...defendSoldier};
                attr.name = `守方士兵${index + 1}`;
                return new Hero(attr);
            }),
            new Hero(defendHero)
        ];

        // 设置目标
        gf.forEach(hero => hero.setTargets(sf));
        sf.forEach(hero => hero.setTargets(gf));

        this.heroList = [...gf, ...sf];
    }

    handleGameOver() {
        if (this.realTime) {
            cancelAnimationFrame(this.animationId);
        }
        this.isRunning = false;
        this.onGameOver?.();
    }

    update(timestamp) {
        if (!this.isRunning) return;

        // 计算时间差
        let deltaTime;
        if (this.realTime) {
            if (this.lastTime === null) {
                this.lastTime = timestamp;
                deltaTime = 0;
            } else {
                deltaTime = timestamp - this.lastTime;
                this.lastTime = timestamp;
            }
        } else {
            deltaTime = this.interval;
        }

        this.globalTime = parseFloat((deltaTime + this.globalTime).toFixed());

        // 更新所有单位
        this.heroList.forEach(hero => hero.update(this.globalTime));

        // 检查游戏是否需要强制结束
        if (this.globalTime > this.maxTime) {
            this.handleGameOver();
            throw new Error(`游戏时长不可能超过${this.maxTime/1000}秒，直接结束`);
        }

        // 检查是否需要停止更新
        if (!this.heroList.some(hero => hero.isNeedUpdate())) {
            console.log("战斗结束: " + this.globalTime + "ms");
            
            const logger = BattleLogger.getInstance();
            
            // 精确匹配示例
            logger.printBattleResult({
                name: '攻方英雄',
                nameMatchMode: 'exact',
                timeRange: [0, this.globalTime],
                includeTypes: ['stage','attack', 'kill']
            });
            
            // 包含匹配示例
            logger.printFilteredLogs({
                name: '攻方英雄',
                nameMatchMode: 'exact',
                timeRange: [0, this.globalTime],
                includeTypes: ['stage','attack', 'kill']
            });

            this.handleGameOver();
            return;
        }

        // 继续下一帧
        if (this.realTime) {
            this.animationId = requestAnimationFrame(this.update.bind(this));
        } else {
            // 快速模式下直接执行下一次更新
            this.update();
        }
    }

    start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        console.log("战斗开始");

        if (this.realTime) {
            this.animationId = requestAnimationFrame(this.update.bind(this));
        } else {
            // 快速模式下直接开始更新
            this.update();
        }
    }

    stop() {
        this.isRunning = false;
        if (this.realTime) {
            cancelAnimationFrame(this.animationId);
        }
    }
}
