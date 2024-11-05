---
title: "{{ replace .Name "-" " " | title }}"
date: {{ .Date }}
slug: "{{ .Name | regex_replace '[^a-zA-Z0-9-]' '' | lower }}"
---