<script setup lang="ts">
import { ref } from 'vue';
import { Download, Trash2, Info, Heart, Shield, Smartphone, Upload, X, AlertCircle, CheckCircle, FileText } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { usePainRecord } from '@/composables/usePainRecord';
import type { ImportResult } from '@/composables/useIndexedDB';

const router = useRouter();

const recordService = usePainRecord();

const isExporting = ref(false);
const isClearing = ref(false);
const isImporting = ref(false);
const showClearConfirm = ref(false);
const showImportConfirm = ref(false);
const showImportResult = ref(false);
const exportSuccess = ref(false);
const importResult = ref<ImportResult | null>(null);
const importError = ref('');
const selectedFile = ref<File | null>(null);
const isDragging = ref(false);

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

const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    selectedFile.value = file;
    showImportConfirm.value = true;
  }
};

const handleDrop = (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = false;
  const file = event.dataTransfer?.files?.[0];
  if (file && file.name.endsWith('.json')) {
    selectedFile.value = file;
    showImportConfirm.value = true;
  } else if (file) {
    importError.value = '请选择 JSON 格式的导出文件';
  }
};

const handleDragOver = (event: DragEvent) => {
  event.preventDefault();
  isDragging.value = true;
};

const handleDragLeave = () => {
  isDragging.value = false;
};

const readFileAsText = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
};

const performImport = async () => {
  if (!selectedFile.value) return;

  isImporting.value = true;
  importError.value = '';

  try {
    const content = await readFileAsText(selectedFile.value);
    const result = await recordService.importData(content);
    importResult.value = result;
    showImportResult.value = true;
  } catch (error) {
    importError.value = error instanceof Error ? error.message : '文件读取失败';
  } finally {
    isImporting.value = false;
    showImportConfirm.value = false;
    selectedFile.value = null;
  }
};

const cancelImport = () => {
  showImportConfirm.value = false;
  selectedFile.value = null;
};

const closeImportResult = () => {
  showImportResult.value = false;
  importResult.value = null;
  importError.value = '';
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
        <h3 class="section-title">
          <Upload :size="20" class="text-emerald-400" />
          数据导入
        </h3>
        <p class="text-sm text-white/60 mb-4">
          从导出的 JSON 文件导入数据。系统会自动校验数据格式，重复数据将被跳过。
        </p>
        <div
          class="border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all"
          :class="isDragging ? 'border-emerald-400 bg-emerald-400/10' : 'border-white/20 hover:border-emerald-400/50 hover:bg-white/5'"
          @drop="handleDrop"
          @dragover="handleDragOver"
          @dragleave="handleDragLeave"
          @click="($refs.fileInput as HTMLInputElement)?.click()"
        >
          <Upload :size="32" class="mx-auto mb-3 text-white/40" />
          <p class="text-sm text-white/70 mb-2">点击选择文件或拖拽 JSON 文件到此处</p>
          <p class="text-xs text-white/40">仅支持本应用导出的 JSON 文件</p>
          <input
            ref="fileInput"
            type="file"
            accept=".json,application/json"
            class="hidden"
            @change="handleFileSelect"
          />
        </div>
        <p v-if="importError" class="text-red-400 text-sm mt-3">
          ⚠️ {{ importError }}
        </p>
      </div>

      <div class="glass-card p-5">
        <h3 class="section-title">
          <FileText :size="20" class="text-purple-400" />
          月度健康报告
        </h3>
        <p class="text-sm text-white/60 mb-4">
          汇总疼痛趋势、高频诱因与用药情况，生成可打印的就医摘要并支持导出图片
        </p>
        <button
          @click="router.push('/report')"
          class="btn-primary flex items-center gap-2 !py-2 !px-4"
        >
          <FileText :size="18" />
          查看月度报告
        </button>
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

    <div
      v-if="showImportConfirm"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click.self="cancelImport"
    >
      <div class="glass-card p-6 max-w-md w-full animate-bounce-subtle">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold text-emerald-400">确认导入</h3>
          <button @click="cancelImport" class="text-white/40 hover:text-white/70 transition-colors">
            <X :size="20" />
          </button>
        </div>
        <div class="bg-white/5 p-4 rounded-xl mb-6">
          <p class="text-sm text-white/70 mb-2">
            <strong class="text-white/90">文件名：</strong>
          </p>
          <p class="text-sm text-white/50 font-mono mb-4 break-all">
            {{ selectedFile?.name }}
          </p>
          <p class="text-sm text-white/70 mb-2">
            <strong class="text-white/90">文件大小：</strong>
            {{ selectedFile ? (selectedFile.size / 1024).toFixed(2) : '0' }} KB
          </p>
        </div>
        <div class="bg-amber-400/10 border border-amber-400/30 rounded-xl p-4 mb-6">
          <div class="flex items-start gap-3">
            <AlertCircle :size="20" class="text-amber-400 flex-shrink-0 mt-0.5" />
            <div class="text-sm text-amber-200/80">
              <p class="mb-1">导入说明：</p>
              <ul class="list-disc list-inside space-y-1 text-xs">
                <li>系统会自动校验数据格式的完整性</li>
                <li>重复数据（基于时间戳和唯一标识）将被自动跳过</li>
                <li>关联数据（如用药、运动记录）会自动关联到正确的主记录</li>
                <li>此操作不会覆盖现有数据，仅添加新记录</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="flex gap-3">
          <button
            @click="cancelImport"
            class="btn-secondary flex-1"
            :disabled="isImporting"
          >
            取消
          </button>
          <button
            @click="performImport"
            class="btn-primary flex-1 flex items-center justify-center gap-2"
            :disabled="isImporting"
          >
            <Upload :size="18" />
            {{ isImporting ? '导入中...' : '确认导入' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showImportResult && importResult"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      @click.self="closeImportResult"
    >
      <div class="glass-card p-6 max-w-md w-full animate-bounce-subtle max-h-[80vh] overflow-y-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-xl font-bold" :class="importResult.success ? 'text-emerald-400' : 'text-red-400'">
            <span v-if="importResult.success">导入完成</span>
            <span v-else>导入失败</span>
          </h3>
          <button @click="closeImportResult" class="text-white/40 hover:text-white/70 transition-colors">
            <X :size="20" />
          </button>
        </div>

        <div v-if="importResult.success" class="mb-6">
          <div class="flex items-center gap-3 mb-4 p-4 bg-emerald-400/10 rounded-xl">
            <CheckCircle :size="28" class="text-emerald-400" />
            <div>
              <p class="text-white font-semibold">导入成功</p>
              <p class="text-sm text-white/60">共 {{ importResult.total }} 条数据</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 mb-4">
            <div class="bg-emerald-400/10 p-3 rounded-xl text-center">
              <p class="text-2xl font-bold text-emerald-400">{{ importResult.imported }}</p>
              <p class="text-xs text-white/60">新增</p>
            </div>
            <div class="bg-amber-400/10 p-3 rounded-xl text-center">
              <p class="text-2xl font-bold text-amber-400">{{ importResult.skipped }}</p>
              <p class="text-xs text-white/60">跳过（重复）</p>
            </div>
          </div>

          <div class="space-y-2">
            <p class="text-sm text-white/80 font-semibold mb-2">详细信息：</p>
            <div v-for="(value, key) in importResult.details" :key="key" class="flex justify-between items-center text-sm bg-white/5 p-2 rounded-lg">
              <span class="text-white/60 capitalize">
                {{
                  key === 'painRecords' ? '疼痛记录' :
                  key === 'medications' ? '用药记录' :
                  key === 'exercises' ? '运动记录' :
                  key === 'weather' ? '天气数据' :
                  key === 'medicationPlans' ? '用药计划' :
                  key === 'medicationLogs' ? '用药日志' : key
                }}
              </span>
              <span class="text-white/80">
                <span class="text-emerald-400">+{{ value.imported }}</span>
                <span v-if="value.skipped > 0" class="text-amber-400 ml-2">↻{{ value.skipped }}</span>
              </span>
            </div>
          </div>
        </div>

        <div v-else class="mb-6">
          <div class="flex items-center gap-3 mb-4 p-4 bg-red-400/10 rounded-xl">
            <AlertCircle :size="28" class="text-red-400" />
            <div>
              <p class="text-white font-semibold">导入失败</p>
              <p class="text-sm text-white/60">请检查文件格式是否正确</p>
            </div>
          </div>
          <div v-for="(error, index) in importResult.errors" :key="index" class="text-sm text-red-300 bg-red-400/10 p-3 rounded-xl mb-2">
            {{ error }}
          </div>
        </div>

        <button
          @click="closeImportResult"
          class="btn-primary w-full"
        >
          确定
        </button>
      </div>
    </div>
  </div>
</template>
