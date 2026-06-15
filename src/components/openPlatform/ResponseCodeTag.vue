<template>
  <a-tag v-if="hasValue" :color="tagColor" :title="tooltip">
    {{ primaryText }}<span v-if="showSuffix" class="code-suffix">{{ suffixText }}</span>
  </a-tag>
  <span v-else class="response-code-empty">{{ emptyText }}</span>
</template>

<script>
import { responseCodeColor, responseCodeLabel } from '@/constants/openPlatformDisplay'

export default {
  name: 'ResponseCodeTag',
  props: {
    value: {
      type: [Number, String],
      default: undefined
    },
    showCode: {
      type: Boolean,
      default: true
    },
    emptyText: {
      type: String,
      default: '-'
    }
  },
  computed: {
    hasValue () {
      return this.value !== undefined && this.value !== null && this.value !== ''
    },
    numericCode () {
      return this.hasValue ? Number(this.value) : null
    },
    tagColor () {
      return responseCodeColor(this.numericCode)
    },
    primaryText () {
      return responseCodeLabel(this.numericCode)
    },
    showSuffix () {
      return this.showCode && this.numericCode !== 0
    },
    suffixText () {
      return ` (${this.numericCode})`
    },
    tooltip () {
      if (!this.hasValue) return ''
      return `responseCode=${this.numericCode}`
    }
  }
}
</script>

<style scoped>
.code-suffix {
  opacity: 0.85;
  font-size: 12px;
}

.response-code-empty {
  color: rgba(0, 0, 0, 0.25);
}
</style>
