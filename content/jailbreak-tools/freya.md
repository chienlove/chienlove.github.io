---
title: Freya
date: 2024-09-03T23:09:39.409Z
icon: /images/img_1032.png
description: >-
  A Complete fully open-sourced iOS 11.0 - 12.5.6 jailbreak.


  * tested on iOS 11.4, 12.1.2, 12.1.3, 12.1.4, 12.2, 12.3, 12.3.1, 12.4, 12.4.4(iirc) and of course 12.5.(1-6), between my iPhone 5s & iPhone 6+ iPad mini 2.

  * AMFID destroyed!

  * await further bugs found or reported.

  * New jailbreakd, pspawn_payload & amfid_payload.

  * setuid systemwide(for the most part at least). note to devs making apps or tools that require setuid permissions. make sure to chmod your tool before compiling or packaging. if you've failed to do so, then at least make a postinst in your deb package to apply chmod to your selected files.

  * new ldrestart(launch daemon restart) designed for Freya. await any bug reports.

  * tested apps or tools for setuid permssions: crackerxi for hooking and decrypting app. (working) vnodebypass for hiding jailbreak files detection, after manually chmod to app binary(working) . A-bypass for hiding jb detection. installed but not sure if working. what apps to test? filza file manager - to copy and move files around the system, to view properties or to set permissions etc of a process.... THESE ARE VERY BUGGY and tend to fail and crash the app or just not work. Resort to Mterminal or ssh to do these things manually with bash. IDK what filza's problem is tbh(although it works fine with other jailbreaks. i.e. set permissions copy and mv files without a hitch)
developer: pwned4ever
categories: Jailbreak
size: Updating…
ios_compatible: 11.0 - 12.5.6
keywords:
  - Freya
main_download:
  version: 1.3.8
  appId: freya
  plistUrl: https://storeios.net/plist/freya.plist
category: Tool jailbreak
---
