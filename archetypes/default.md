---
title: "{{ replace .Name "-" " " | title }}"
date: {{ .Date }}
slug: "{{ .Name | replaceRE '[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]' 'a' | replaceRE '[èéẹẻẽêềếệểễ]' 'e' | replaceRE '[ìíịỉĩ]' 'i' | replaceRE '[òóọỏõôồốộổỗơờớợởỡ]' 'o' | replaceRE '[ùúụủũưừứựửữ]' 'u' | replaceRE '[ỳýỵỷỹ]' 'y' | replaceRE '[đ]' 'd' | urlize }}"
---