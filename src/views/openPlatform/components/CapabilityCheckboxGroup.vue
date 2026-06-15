<template>
  <a-checkbox-group
    :value="value"
    :disabled="disabled"
    @change="onChange"
  >
    <div class="capability-checkbox-grid">
      <div
        v-for="item in options"
        :key="item.code"
        class="capability-checkbox-item"
      >
        <a-checkbox :value="item.code">{{ item.label }}</a-checkbox>
      </div>
    </div>
  </a-checkbox-group>
</template>

<script>
import { OPEN_PLATFORM_CAPABILITIES } from '@/constants/openPlatformCapabilities'

export default {
  name: 'CapabilityCheckboxGroup',
  props: {
    value: {
      type: Array,
      default: () => []
    },
    disabled: {
      type: Boolean,
      default: false
    }
  },
  data () {
    return {
      options: OPEN_PLATFORM_CAPABILITIES
    }
  },
  methods: {
    onChange (checked) {
      this.$emit('input', checked)
      this.$emit('change', checked)
    }
  }
}
</script>
