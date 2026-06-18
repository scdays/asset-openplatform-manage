<template>
  <div v-if="hints.length" class="enum-hints">
    <div class="enum-hints-title">枚举释义</div>
    <div class="enum-hints-list">
      <a-tag v-for="item in hints" :key="item.field + '-' + item.value" class="enum-hint-tag">
        {{ item.field }}：{{ item.text }}
      </a-tag>
    </div>
  </div>
</template>

<script>
import { collectEnumHintsFromJson } from '@/constants/openPlatformDisplay'

export default {
  name: 'InvocationEnumHints',
  props: {
    jsonText: {
      type: String,
      default: ''
    }
  },
  computed: {
    hints () {
      return collectEnumHintsFromJson(this.jsonText)
    }
  }
}
</script>

<style scoped>
.enum-hints {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #f0f0f0;
}

.enum-hints-title {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.45);
  margin-bottom: 6px;
}

.enum-hints-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.enum-hint-tag {
  margin: 0;
}
</style>
