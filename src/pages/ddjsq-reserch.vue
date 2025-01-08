<template>
  <div flex="box:mean" style="width:1000px;">
    <el-form v-for="(item,index) in formList" :key="index" :size="'small'" :model="item" label-width="150px">
      <el-form-item label="英雄名称">
        <el-input v-model="item.name"></el-input>
      </el-form-item>

      <el-form-item label="生命值">
        <el-input-number v-model="item.health" :min="0" label="Health"></el-input-number>
      </el-form-item>

      <el-form-item label="位置">
        <el-input-number v-model="item.position" :min="0" label="Position"></el-input-number>
      </el-form-item>

      <el-form-item label="移动速度">
        <el-input-number v-model="item.speed" :min="0" label="Speed (ms)"></el-input-number>
      </el-form-item>

      <el-form-item label="攻击距离">
        <el-input-number v-model="item.attackDistance" :min="0" label="Attack Distance (ms)"></el-input-number>
      </el-form-item>

      <el-form-item label="最多命中">
        <el-input-number v-model="item.maxHits" :min="1" label="Max Hits"></el-input-number>
      </el-form-item>

      <el-form-item label="攻击次数">
        <el-input-number v-model="item.attackCount" :min="1" label="Attack Count"></el-input-number>
      </el-form-item>

      <el-form-item label="咏唱时间">
        <el-input-number v-model="item.chantTime" :min="0" label="Chant Time (ms)"></el-input-number>
      </el-form-item>

      <el-form-item label="移动延迟">
        <el-input-number v-model="item.moveDelay" :min="0" label="Move Delay (ms)"></el-input-number>
      </el-form-item>

      <el-form-item label="施放时间">
        <el-input-number v-model="item.castTime" :min="0" label="Cast Time (ms)"></el-input-number>
      </el-form-item>

      <el-form-item label="击中时间">
        <el-input-number v-model="item.attackedTime" :min="0" label="Attacked Time (ms)"></el-input-number>
      </el-form-item>

      <el-form-item label="范围击中时间">
        <el-input-number v-model="item.rangeHitTime" :min="0" label="Range Hit Time (ms)"></el-input-number>
      </el-form-item>

      <el-form-item label="再次攻击等待时间">
        <el-input-number v-model="item.attackAgainWait" :min="0" label="Attack Again Wait Time (ms)"></el-input-number>
      </el-form-item>

      <el-form-item label="收尾时间">
        <el-input-number v-model="item.tailTime" :min="0" label="Tail Time (ms)"></el-input-number>
      </el-form-item>

      <el-form-item label="准备特效">
        <el-input-number v-model="item.prepareSpecial" :min="0" label="Prepare Special (ms)"></el-input-number>
      </el-form-item>

      <el-form-item label="打英雄伤害">
        <el-input-number v-model="item.dyx_sh"></el-input-number>
      </el-form-item>
      <el-form-item label="打小兵伤害">
        <el-input-number v-model="item.dsb_sh"></el-input-number>
      </el-form-item>


    </el-form>
  </div>
  <el-button type="primary" @click="start">
    点我开始
  </el-button>

</template>

<script setup>
import {reactive} from 'vue'
import {Hero,BattleLogger,Game} from './ddjsq-reserch/utils'
// 海德拉水兽
const heroAttributes = reactive({
  name: "冲1",
  health: 14968,
  position: 0,
  speed: 400,// 移动速度 单位长度/ms 假设走完全程需要1200ms
  attackDistance: 50, // 攻击距离  全程1200
  maxHits: 20, // 最多命中(每次攻击打出伤害段数)
  attackCount: 1, // 攻击次数
  chantTime: 0, // 咏唱时间
  moveDelay: 600, // 移动延迟
  castTime: 400, // 施放时间
  attackedTime: 300, // 击中时间
  rangeHitTime: 35, // 范围击中时间（多段伤害每段间隔）
  attackAgainWait: 0, // 再次攻击等待时间
  tailTime: 1300, // 收尾时间
  prepareSpecial: 0,  // 准备特效
  attackDirection: 1,
  dyx_sh: 1080,
  dsb_sh: 888,
  type: Hero.Type.HERO,
});

const enemyAttributes = reactive({
  name: "冲2",
  health: 14118,
  position: 1200,
  speed: 400,// 移动速度 单位 m/ms 假设全程需要1200ms  则总路程 1200*400 = 480000m

  attackDistance: 50, // 攻击距离
  maxHits: 20, // 最多命中(每次攻击打出伤害段数)
  attackCount: 1, // 攻击次数
  chantTime: 0, // 咏唱时间
  moveDelay: 0, // 移动延迟
  castTime: 300, // 施放时间
  attackedTime: 0, // 击中时间
  rangeHitTime: 30, // 范围击中时间（多段伤害每段间隔）
  attackAgainWait: 0, // 再次攻击等待时间
  tailTime: 1300, // 收尾时间
  prepareSpecial: 0,  // 准备特效
  attackDirection: -1,
  dyx_sh: 991,
  dsb_sh: 666,
});

//决赛圈案例1  女王出手了

// //案例2自由梦  女王没出手
// heroAttributes.health = 13457
// enemyAttributes.dyx_sh = 938

// //案例3A.Hello ^Z.huan  女王没出手
// heroAttributes.health = 15347
// enemyAttributes.dyx_sh = 1039

//案例4珍贵的视频 女王出手了
// heroAttributes.health = 13828
// enemyAttributes.dyx_sh = 1048


// heroAttributes.castTime = 400
// enemyAttributes.rangeHitTime = 30


const formList = [
  heroAttributes,
  enemyAttributes
]


const gfyxAttr = reactive({
  name: "攻方英雄",
  health: 14968,
  position: 0,
  speed: 400,// 移动速度 单位长度/ms 假设走完全程需要1200ms
  attackDistance: 50, // 攻击距离  全程1200
  maxHits: 20, // 最多命中(每次攻击打出伤害段数)
  attackCount: 1, // 攻击次数
  chantTime: 0, // 咏唱时间
  moveDelay: 600, // 移动延迟
  castTime: 400, // 施放时间
  attackedTime: 300, // 击中时间
  rangeHitTime: 35, // 范围击中时间（多段伤害每段间隔）
  attackAgainWait: 0, // 再次攻击等待时间
  tailTime: 1300, // 收尾时间
  prepareSpecial: 0,  // 准备特效
  attackDirection: 1,
  dyx_sh: 1080,
  dsb_sh: 888,
  type: Hero.Type.HERO,
});
const gfsbAttr = reactive({
  name: "攻方士兵",
  health: 14968,
  position: 0,
  speed: 400,// 移动速度 单位长度/ms 假设走完全程需要1200ms
  attackDistance: 50, // 攻击距离  全程1200
  maxHits: 20, // 最多命中(每次攻击打出伤害段数)
  attackCount: 1, // 攻击次数
  chantTime: 0, // 咏唱时间
  moveDelay: 600, // 移动延迟
  castTime: 400, // 施放时间
  attackedTime: 300, // 击中时间
  rangeHitTime: 35, // 范围击中时间（多段伤害每段间隔）
  attackAgainWait: 0, // 再次攻击等待时间
  tailTime: 1300, // 收尾时间
  prepareSpecial: 0,  // 准备特效
  attackDirection: 1,
  dyx_sh: 1080,
  dsb_sh: 888,
  type: Hero.Type.SOLDIER,
});

const sfyxAttr = reactive({
  name: "守方英雄",
  health: 14118,
  position: 1200,
  speed: 400,// 移动速度 单位 m/ms 假设全程需要1200ms  则总路程 1200*400 = 480000m

  attackDistance: 50, // 攻击距离
  maxHits: 20, // 最多命中(每次攻击打出伤害段数)
  attackCount: 1, // 攻击次数
  chantTime: 0, // 咏唱时间
  moveDelay: 0, // 移动延迟
  castTime: 300, // 施放时间
  attackedTime: 0, // 击中时间
  rangeHitTime: 30, // 范围击中时间（多段伤害每段间隔）
  attackAgainWait: 0, // 再次攻击等待时间
  tailTime: 1300, // 收尾时间
  prepareSpecial: 0,  // 准备特效
  attackDirection: -1,
  dyx_sh: 991,
  dsb_sh: 666,
  type: Hero.Type.HERO,
});
const sfsbAttr = reactive({
  name: "守方士兵",
  health: 14118,
  position: 1200,
  speed: 400,// 移动速度 单位 m/ms 假设全程需要1200ms  则总路程 1200*400 = 480000m

  attackDistance: 50, // 攻击距离
  maxHits: 20, // 最多命中(每次攻击打出伤害段数)
  attackCount: 1, // 攻击次数
  chantTime: 0, // 咏唱时间
  moveDelay: 0, // 移动延迟
  castTime: 300, // 施放时间
  attackedTime: 0, // 击中时间
  rangeHitTime: 30, // 范围击中时间（多段伤害每段间隔）
  attackAgainWait: 0, // 再次攻击等待时间
  tailTime: 1300, // 收尾时间
  prepareSpecial: 0,  // 准备特效
  attackDirection: -1,
  dyx_sh: 991,
  dsb_sh: 666,
  type: Hero.Type.SOLDIER,
});

// 创建游戏实例
const game = new Game({
    realTime: false, // 使用快速模式
    interval: 16, // 每16ms更新一次
    maxTime: 4000,
    onGameOver: () => {
        console.log('游戏结束');
    }
});

// 修改开始函数
const start = () => {
    // 初始化游戏
    game.reset();
    
    // 使用新的参数结构初始化英雄
    game.initHeroes(
        {
            hero: gfyxAttr,
            soldier: gfsbAttr,
            soldierCount: 10
        },
        {
            hero: sfyxAttr,
            soldier: sfsbAttr,
            soldierCount: 10
        }
    );
    
    game.start();
};


</script>


<style scoped lang="scss">

</style>
