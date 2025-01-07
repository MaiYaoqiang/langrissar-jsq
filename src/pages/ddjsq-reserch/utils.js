import Big from 'big.js';

class BaseEntity {
    constructor() {
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
    constructor({targets, maxHits, hitInterval, initialTime, damageMap, position, attackSpeed, attacker}) {
        super();
        this.targets = targets; // 目标数组
        this.damageMap = damageMap; // 目标与伤害值的映射
        this.maxHits = maxHits;
        this.hitInterval = hitInterval;
        this.position = position;
        this.attackSpeed = attackSpeed;
        this.nextHitTime = initialTime;
        this.hitsDone = 0;
        this.lockedTarget = null; // 锁定的攻击目标
        this.attacker = attacker
    }

    update(globalTime) {
        this.lockedTarget = this.findClosestTarget();

        while (globalTime >= this.nextHitTime && this.hitsDone < this.maxHits) {
            if (!this.lockedTarget || this.lockedTarget.isDead) {
                // 如果目标不存在或已死亡，寻找下一个攻击对象
                this.lockedTarget = this.findClosestTarget();
            }

            const damage = this.damageMap.get(this.lockedTarget) || 0;
            this.lockedTarget.health -= damage;
            this.hitsDone++;
            this.nextHitTime += this.hitInterval;

            if(this.attacker.name.indexOf('冲')>-1){
                console.log(`${this.attacker.name} 对 ${this.lockedTarget.name} 造成第【${this.hitsDone}】次伤害（${damage}），剩余生命值: ${this.lockedTarget.health} at 时间: ${globalTime}ms`);
            }


            if (this.lockedTarget.health <= 0) {
                this.lockedTarget.isDead = true;
                console.log(`${this.lockedTarget.name} 已阵亡 at 时间: ${globalTime}ms`);
                break;
            }
        }

        return this.hitsDone < this.maxHits;
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

    constructor(options) {
        super();
        const {
            id,
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
        } = options || {};

        Object.assign(this, {
            id,
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
    }

    trackEvent(event) {
        console.log(event);
        this.eventList.push(event);
    }

    setTargets(targetDataArray) {
        this.targets = [];
        this.damageMap.clear();

        targetDataArray.forEach(({target, damageValue}) => {
            if (target) {
                this.targets.push(target);
                this.damageMap.set(target, damageValue || 0);
            }
        });
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
                    damageMap: this.damageMap,
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
        this.trackEvent(`${this.name} 当前阶段: ${this.currentAttackStage} at 时间: ${this.globalTime}ms`);
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
