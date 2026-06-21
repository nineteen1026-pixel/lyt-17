<script setup lang="ts">
import { ref } from 'vue';
import { Download, Trash2, Info, Heart, Shield, Smartphone } from 'lucide-vue-next';
import { usePainRecord } from '@/composables/usePainRecord';

const recordService = usePainRecord();

const isExporting = ref(false);
const isClearing = ref(false);
const showClearConfirm = ref(false);
const exportSuccess = ref(false);

const exportData = async () => {
  isExporting.value = true;
  try {
    const data = await recordService.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pain-diary-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    exportSuccess.value = true;
    setTimeout(() => {
      exportSuccess.value = false;
    }, 3000);
  } finally {
    isExporting.value = false;
  }
};

const clearAllData = async () => {
  isClearing.value = true;
  try {
    await recordService.clearAllData();
    showClearConfirm.value = false;
  } finally {
    isClearing.value = false;
  }
};

const checkPWA = () => {
  const isPWA = window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true;
  return isPWA;
};

const isPWA = ref(checkPWA());
</script>

<template>
  <div class="page-container animate-fade-in">
    <h1 class="text-2xl font-bold mb-6">设置</h1>

    <div class="space-y-4">
      <div class="glass-card p-5">
        <h3 class="section-title">
          <Download :size="20" class="text-blue-400" />
          数据导出
        </h3>
        <p class="text-sm text-white/60 mb-4">
          将所有数据导出为 JSON 文件，可用于备份或迁移到其他设备
        </p>
        <button
          @click="exportData"
          class="btn-primary flex items-center gap-2"
          :disabled="isExporting"
        >
          <Download :size="18" />
          {{ isExporting ? '导出中...' : '导出数据' }}
        </button>
        <p v-if="exportSuccess" class="text-emerald-400 text-sm mt-3 animate-bounce-subtle">
          ✅ 导出成功！
        </p>
      </div>

      <div class="glass-card p-5">
        <h3 class="section-title text-red-400">
          <Trash2 :size="20" />
          清除数据
        </h3>
        <p class="text-sm text-white/60 mb-4">
          永久删除所有记录数据。此操作无法撤销，请谨慎操作。
        </p>
        <button
          @click="showClearConfirm = true"
          class="btn-danger flex items-center gap-2"
        >
          <Trash2 :size="18" />
          清除所有数据
        </button>
      </div>

      <div class="glass-card p-5">
        <h3 class="section-title">
          <Smartphone :size="20" class="text-emerald-400" />
          安装应用
        </h3>
        <p class="text-sm text-white/60 mb-4">
          <span v-if="isPWA" class="text-emerald-400">✅ 您正在使用已安装的应用</span>
          <span v-else>
            将此应用添加到主屏幕，即可像普通应用一样使用，支持离线访问。
          </span>
        </p>
        <div v-if="!isPWA" class="bg-white/5 p-4 rounded-xl text-sm text-white/70">
          <p class="mb-2"><strong>iOS：</strong>点击分享按钮 → 添加到主屏幕</p>
          <p class="mb-2"><strong>Android：</strong>点击菜单按钮 → 添加到主屏幕</p>
          <p><strong>桌面端：</strong>点击地址栏右侧的安装图标</p>
        </div>
      </div>

      <div class="glass-card p-5">
        <h3 class="section-title">
          <Shield :size="20" class="text-purple-400" />
          隐私说明
        </h3>
        <p class="text-sm text-white/70 leading-relaxed">
          您的所有数据都存储在本地浏览器的 IndexedDB 中，不会上传到任何服务器。
          我们无法访问您的记录内容，您完全拥有和控制自己的数据。
          建议定期导出数据进行备份，以防止浏览器数据丢失。
        </p>
      </div>

      <div class="glass-card p-5">
        <h3 class="section-title">
          <Info :size="20" class="text-cyan-400" />
          关于
        </h3>
        <div class="space-y-3 text-sm text-white/70">
          <p><strong>疼痛日记 v1.0.0</strong></p>
          <p>
            一款帮助您记录和分析疼痛状况的健康管理应用。
            通过系统记录疼痛部位、程度、诱因等信息，
            帮助您更好地了解自己的身体状况，为就医提供数据支持。
          </p>
          <p class="flex items-center gap-2">
            <Heart :size="14" class="text-red-400" />
            用 Vue 3 + Chart.js 构建
          </p>
        </div>
      </div>
    </div>

    <div
      v-if="showClearConfirm"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click.self="showClearConfirm = false"
    >
      <div class="glass-card p-6 max-w-md w-full animate-bounce-subtle">
        <h3 class="text-xl font-bold mb-4 text-red-400">⚠️ 确认清除</h3>
        <p class="text-white/70 mb-6">
          此操作将永久删除所有数据，包括疼痛记录、用药记录、运动记录和天气数据。
          建议先导出数据进行备份。此操作无法撤销。
        </p>
        <div class="flex gap-3">
          <button
            @click="showClearConfirm = false"
            class="btn-secondary flex-1"
            :disabled="isClearing"
          >
            取消
          </button>
          <button
            @click="clearAllData"
            class="btn-danger flex-1"
            :disabled="isClearing"
          >
            {{ isClearing ? '清除中...' : '确认清除' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
