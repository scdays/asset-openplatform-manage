<template>
  <a-tag
    v-if="hasValue"
    :color="tagColor === 'default' ? undefined : tagColor"
    :class="{ 'enum-tag-default': tagColor === 'default' }"
    :title="showTooltip ? rawValue : undefined"
  >
    {{ displayLabel }}
  </a-tag>
  <span v-else class="enum-tag-empty">{{ emptyText }}</span>
</template>

<script>
import { labelOf, colorOf } from '@/constants/openPlatformDisplay'

export default {
  name: 'EnumTag',
  props: {
    type: {
      type: String,
      required: true
    },
    value: {
      type: [String, Number],
      default: undefined
    },
    emptyText: {
      type: String,
      default: '-'
    },
    showTooltip: {
      type: Boolean,
      default: true
    },
    fallback: {
      type: String,
      default: undefined
    }
  },
  computed: {
    hasValue () {
      return this.value !== undefined && this.value !== null && this.value !== ''
    },
    rawValue () {
      return this.hasValue ? String(this.value) : ''
    },
    displayLabel () {
      return labelOf(this.type, this.value, this.fallback !== undefined ? this.fallback : this.rawValue)
    },
    tagColor () {
      return colorOf(this.type, this.value)
    }
  }
}
</script>

<style scoped>
.enum-tag-empty {
  color: rgba(0, 0, 0, 0.45);
}

.enum-tag-default {
  color: rgba(0, 0, 0, 0.75) !important;
  background: #fafafa !important;
  border: 1px solid #d9d9d9 !important;
}
</style>
