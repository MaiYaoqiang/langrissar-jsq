<template>
  <div>
    <div>
      1P:<HeroSelector v-model="heroPool1P" :maxSelection="15" />
    </div>
    <div>
      2P:<HeroSelector v-model="heroPool2P" :maxSelection="15" />
    </div>
    <el-button type="primary" @click="initHeroes">初始化BP</el-button>
  </div>
  <div class="hero-simulator mt_16">
    <div class="main-layout">
      <div class="hero-section">
        <h3>1P 英雄池</h3>
        <div class="heroes">
          <div
              v-for="(hero,index) in heroes1P"
              :key="hero.heroName"
              class="hero"
              :class="{ disabled: hero.status === 'disabled', selected: hero.status === 'selected' }"
              @click="handleHeroClick(hero, '1P')"
          >
            <img :src="hero.logo" :alt="hero.heroName"/>
            <!-- <span>{{ hero.heroName }}</span> -->
          </div>
        </div>
        <div v-if="!canOperate('1P')" class="overlay">
          <span>请稍候...</span>
        </div>
      </div>

      <div class="action-info">
        <h2>当前操作</h2>
        <p>{{ currentPlayer }} 回合 - {{ currentAction }}</p>
        <button @click="undoStep" :disabled="state.turn === 1">撤销上一步</button>
      </div>

      <div class="hero-section">
        <h3>2P 英雄池</h3>
        <div class="heroes">
          <div
              v-for="(hero,index) in heroes2P"
              :key="hero.heroName"
              class="hero"
              :class="{ disabled: hero.status === 'disabled', selected: hero.status === 'selected' }"
              @click="handleHeroClick(hero, '2P')"
          >
            <img :src="hero.logo" :alt="hero.heroName"/>
            <!-- <span>{{ hero.heroName }}</span> -->
          </div>
        </div>
        <div v-if="!canOperate('2P')" class="overlay">
          <span>请稍候...</span>
        </div>
      </div>
    </div>
  </div>

</template>

<script setup>
import {reactive, computed, onMounted, ref} from 'vue';
import HeroSelector from '@/components/HeroSelector.vue';
import {useRefCache} from "@/common/hook";


const heroPool1P = useRefCache('langrissar-calculator-bp-simulate-heroPool1P', []);
const heroPool2P = useRefCache('langrissar-calculator-bp-simulate-heroPool2P', []);

const initHeroes = () => {
  // 使用 heroPool1P 初始化 heroes1P
  heroes1P.splice(0, heroes1P.length, ...heroPool1P.value.map((hero, index) => ({
    id: `1P_${index + 1}`,
    heroName: hero.heroName,
    logo: hero.logo,
    status: 'available',
  })));


  // 使用 heroPool2P 初始化 heroes2P
  heroes2P.splice(0, heroes2P.length, ...heroPool2P.value.map((hero, index) => ({
    id: `2P_${index + 1}`,
    heroName: hero.heroName,
    logo: hero.logo,
    status: 'available',
  })));
};

onMounted(()=>{
  initHeroes()
})

// 初始化英雄池
const heroes1P = reactive(
    Array.from({length: 15}, (_, index) => ({
      id: `1P_${index + 1}`,
      heroName: `1P英雄${index + 1}`,
      logo: `https://placekitten.com/80/80?image=${index + 1}`,
      status: 'available', // 状态: available, disabled, selected
    }))
);

const heroes2P = reactive(
    Array.from({length: 15}, (_, index) => ({
      id: `2P_${index + 16}`,
      heroName: `2P英雄${index + 1}`,
      logo: `https://placekitten.com/80/80?image=${index + 16}`,
      status: 'available',
    }))
);

const state = reactive({
  turn: 1, // 当前回合数
  actionSequence: [
    {player: '2P', action: 'ban'},
    {player: '1P', action: 'ban'},
    {player: '1P', action: 'pick'},
    {player: '2P', action: 'ban'},
    {player: '2P', action: 'ban'},
    {player: '2P', action: 'pick'},
    {player: '1P', action: 'ban'},
    {player: '1P', action: 'ban'},
    {player: '1P', action: 'pick'},
    {player: '2P', action: 'ban'},
    {player: '2P', action: 'ban'},
    {player: '2P', action: 'pick'},
    {player: '1P', action: 'ban'},
    {player: '1P', action: 'ban'},
    {player: '1P', action: 'pick'},
    {player: '2P', action: 'ban'},
    {player: '2P', action: 'ban'},
    {player: '2P', action: 'pick'},
    {player: '1P', action: 'ban'},
    {player: '1P', action: 'ban'},
    {player: '1P', action: 'pick'},
    {player: '2P', action: 'ban'},
    {player: '2P', action: 'ban'},
    {player: '2P', action: 'pick'},
    {player: '1P', action: 'ban'},
    {player: '1P', action: 'ban'},
    {player: '1P', action: 'pick'},
    {player: '2P', action: 'pick'},
  ],
  history: [],
});

const currentStep = computed(() => state.actionSequence[state.turn - 1]);

const canOperate = (pool) => {
  const step = currentStep.value;
  if (!step) return false;
  const isBan = step.action === 'ban' && pool !== step.player;
  const isPick = step.action === 'pick' && pool === step.player;
  return isBan || isPick;
};

const handleHeroClick = (hero, pool) => {
  if (!canOperate(pool) || hero.status !== 'available') return;

  const step = currentStep.value;
  if (step.action === 'ban') {
    hero.status = 'disabled';
  } else if (step.action === 'pick') {
    hero.status = 'selected';
  }

  state.history.push({turn: state.turn, heroId: hero.id, status: hero.status});
  state.turn++;
};

const undoStep = () => {
  if (state.turn === 1) return;

  const lastAction = state.history.pop();
  if (!lastAction) return;

  const {heroId, status} = lastAction;
  const hero = [...heroes1P, ...heroes2P].find((h) => h.id === heroId);
  if (hero) hero.status = 'available';

  state.turn--;
};

const currentPlayer = computed(() => currentStep.value?.player || '');
const currentAction = computed(() => {
  const step = currentStep.value;
  if (!step) return '';
  return step.action === 'ban' ? '禁用对手英雄' : '选择自己的英雄';
});


</script>

<style scoped lang="scss">
.hero-simulator {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.main-layout {
  display: flex;
  justify-content: space-between;
  gap: 16px;
}

.hero-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
}

.heroes {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  width: 300px;
  justify-content: space-between;
}

.hero {
  border: 2px solid transparent;
  cursor: pointer;
  text-align: center;
  transition: border-color 0.3s;
  width:30%;
  box-sizing: border-box;
  img{
    width:100%;
    display: block;
  }
}

.hero.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.hero.selected {
  border-color: blue;
}

.action-info {
  flex: 0 0 200px;
  text-align: center;
}

.overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.2);
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-size: 18px;
  z-index: 10;
}
</style>
