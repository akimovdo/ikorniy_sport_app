<template>
  <div>
    <v-btn
      v-if="!running"
      icon="mdi-timer-outline"
      color="primary"
      variant="elevated"
      size="large"
      class="rest-timer-fab"
      @click="dialog = true"
    />
    <v-btn
      v-else
      color="secondary"
      variant="elevated"
      class="rest-timer-fab"
      @click="dialog = true"
    >
      <v-icon start icon="mdi-timer" />
      {{ formatTime }}
    </v-btn>

    <v-dialog v-model="dialog" max-width="340">
      <v-card class="pa-4">
        <v-card-title class="px-0">Таймер отдыха</v-card-title>

        <div
          class="text-h3 text-center font-weight-bold my-4"
          style="font-variant-numeric: tabular-nums"
        >
          {{ formatTime }}
        </div>

        <div v-if="!running" class="d-flex flex-wrap ga-2 justify-center mb-4">
          <v-btn
            v-for="d in presets"
            :key="d"
            variant="tonal"
            color="primary"
            @click="start(d)"
          >
            {{ d }} сек
          </v-btn>
        </div>

        <div class="d-flex justify-center ga-2 mb-2">
          <template v-if="running">
            <v-btn variant="tonal" color="warning" @click="pause">Пауза</v-btn>
          </template>
          <template v-else-if="total > 0">
            <v-btn variant="tonal" color="primary" @click="resume">Продолжить</v-btn>
          </template>
          <v-btn variant="text" color="error" :disabled="total === 0" @click="reset">
            Сброс
          </v-btn>
        </div>

        <v-alert
          v-if="finished"
          type="success"
          variant="tonal"
          density="compact"
          class="mt-2"
        >
          Отдых закончен — можно к следующему подходу!
        </v-alert>
      </v-card>
    </v-dialog>
  </div>
</template>

<script setup lang="ts">
const presets = [60, 90, 120, 180]

const dialog = ref(false)
const total = ref(0)
const remaining = ref(0)
const running = ref(false)
const finished = ref(false)
let intervalId: ReturnType<typeof setInterval> | null = null

const formatTime = computed(() => {
  const m = Math.floor(remaining.value / 60)
  const s = remaining.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

function clear() {
  if (intervalId) {
    clearInterval(intervalId)
    intervalId = null
  }
}

function start(secs: number) {
  clear()
  total.value = secs
  remaining.value = secs
  running.value = true
  finished.value = false
  intervalId = setInterval(tick, 1000)
}

function tick() {
  if (remaining.value > 0) {
    remaining.value--
  }
  if (remaining.value <= 0) {
    running.value = false
    finished.value = true
    clear()
    beep()
  }
}

function pause() {
  running.value = false
  clear()
}

function resume() {
  if (remaining.value <= 0) return
  running.value = true
  finished.value = false
  intervalId = setInterval(tick, 1000)
}

function reset() {
  clear()
  total.value = 0
  remaining.value = 0
  running.value = false
  finished.value = false
}

function beep() {
  try {
    const ctx = new AudioContext()
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = 880
      gain.gain.value = 0.3
      const t = ctx.currentTime + i * 0.4
      osc.start(t)
      osc.stop(t + 0.25)
    }
    setTimeout(() => ctx.close(), 1500)
  } catch (e) {
    // AudioContext может быть недоступен — игнорируем
  }
}

onBeforeUnmount(clear)
</script>

<style scoped>
.rest-timer-fab {
  position: fixed;
  bottom: 24px;
  right: 16px;
  z-index: 20;
}
</style>
