#!/bin/sh
LINUX=$(find linux* -maxdepth 0)
qemu-system-i386  -kernel vmlinux-2.6.20.bin  -m 128M -initrd rootfs.img.gz -append "root=/dev/ram rdinit=bin/sh init=linuxrc console=ttyS0" -serial stdio   -vnc 0.0.0.0:4
