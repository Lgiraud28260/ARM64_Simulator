#!/usr/bin/env python3
"""Launch ARM64 Simulator as a standalone desktop app."""
import webview

webview.create_window(
    'ARM64v8 Simulator',
    'index.html',
    width=1400,
    height=900,
    min_size=(1000, 600)
)
webview.start()
