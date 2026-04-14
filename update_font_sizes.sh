#!/bin/bash

# Replace text-[10px] with text-[12px]
grep -rl "text-\[10px\]" . | xargs sed -i 's/text-\[10px\]/text-[12px]/g'

# Replace text-xs with text-sm
grep -rl "text-xs" . | xargs sed -i 's/text-xs/text-sm/g'

# Replace text-sm with text-base
grep -rl "text-sm" . | xargs sed -i 's/text-sm/text-base/g'

# Replace text-base with text-lg (careful with this one, maybe too much)
# grep -rl "text-base" . | xargs sed -i 's/text-base/text-lg/g'
