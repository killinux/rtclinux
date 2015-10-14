/*
   PC Emulator

   Copyright (c) 2011 Fabrice Bellard

   Redistribution or commercial use is prohibited without the author's
   permission.
*/
"use strict";
var aa = [1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1, 1, 0, 0, 1, 0, 1, 1, 0, 1, 0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 0, 0, 1];
var ba = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
var ca = [0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0, 1, 2, 3, 4];
function CPU_X86() {
    var i, da;
    this.regs = new Array();
    for (i = 0; i < 8; i++) this.regs[i] = 0;
    this.eip = 0;
    this.cc_op = 0;
    this.cc_dst = 0;
    this.cc_src = 0;
    this.cc_op2 = 0;
    this.cc_dst2 = 0;
    this.df = 1;
    this.eflags = 0x2;
    this.cycle_count = 0;
    this.hard_irq = 0;
    this.hard_intno = -1;
    this.cpl = 0;
    this.cr0 = (1 << 0);
    this.cr2 = 0;
    this.cr3 = 0;
    this.cr4 = 0;
    this.idt = {
        base: 0,
        limit: 0
    };
    this.gdt = {
        base: 0,
        limit: 0
    };
    this.segs = new Array();
    for (i = 0; i < 7; i++) {
        this.segs[i] = {
            selector: 0,
            base: 0,
            limit: 0,
            flags: 0
        };
    }
    this.segs[2].flags = (1 << 22);
    this.segs[1].flags = (1 << 22);
    this.tr = {
        selector: 0,
        base: 0,
        limit: 0,
        flags: 0
    };
    this.ldt = {
        selector: 0,
        base: 0,
        limit: 0,
        flags: 0
    };
    this.halted = 0;
    this.phys_mem = null;
    da = 0x100000;
    this.tlb_read_kernel = new Int32Array(da);
    this.tlb_write_kernel = new Int32Array(da);
    this.tlb_read_user = new Int32Array(da);
    this.tlb_write_user = new Int32Array(da);
    for (i = 0; i < da; i++) {
        this.tlb_read_kernel[i] = -1;
        this.tlb_write_kernel[i] = -1;
        this.tlb_read_user[i] = -1;
        this.tlb_write_user[i] = -1;
    }
    this.tlb_pages = new Int32Array(2048);
    this.tlb_pages_count = 0;
}
CPU_X86.prototype.phys_mem_resize = function(ea) {
    this.mem_size = ea;
    ea += ((15 + 3) & ~3);
    this.phys_mem = new ArrayBuffer(ea);
    this.phys_mem8 = new Uint8Array(this.phys_mem, 0, ea);
    this.phys_mem16 = new Uint16Array(this.phys_mem, 0, ea / 2);
    this.phys_mem32 = new Int32Array(this.phys_mem, 0, ea / 4);
};
CPU_X86.prototype.ld8_phys = function(fa) {
    return this.phys_mem8[fa];
};
CPU_X86.prototype.st8_phys = function(fa, ga) {
    this.phys_mem8[fa] = ga;
};
CPU_X86.prototype.ld32_phys = function(fa) {
    return this.phys_mem32[fa >> 2];
};
CPU_X86.prototype.st32_phys = function(fa, ga) {
    this.phys_mem32[fa >> 2] = ga;
};
CPU_X86.prototype.tlb_set_page = function(fa, ha, ia, ja) {
    var i, ga, j;
    ha &= -4096;
    fa &= -4096;
    ga = fa ^ ha;
    i = fa >>> 12;
    if (this.tlb_read_kernel[i] == -1) {
        if (this.tlb_pages_count >= 2048) {
            this.tlb_flush_all1((i - 1) & 0xfffff);
        }
        this.tlb_pages[this.tlb_pages_count++] = i;
    }
    this.tlb_read_kernel[i] = ga;
    if (ia) {
        this.tlb_write_kernel[i] = ga;
    } else {
        this.tlb_write_kernel[i] = -1;
    }
    if (ja) {
        this.tlb_read_user[i] = ga;
        if (ia) {
            this.tlb_write_user[i] = ga;
        } else {
            this.tlb_write_user[i] = -1;
        }
    } else {
        this.tlb_read_user[i] = -1;
        this.tlb_write_user[i] = -1;
    }
};
CPU_X86.prototype.tlb_flush_page = function(fa) {
    var i;
    i = fa >>> 12;
    this.tlb_read_kernel[i] = -1;
    this.tlb_write_kernel[i] = -1;
    this.tlb_read_user[i] = -1;
    this.tlb_write_user[i] = -1;
};
CPU_X86.prototype.tlb_flush_all = function() {
    var i, j, n, ka;
    ka = this.tlb_pages;
    n = this.tlb_pages_count;
    for (j = 0; j < n; j++) {
        i = ka[j];
        this.tlb_read_kernel[i] = -1;
        this.tlb_write_kernel[i] = -1;
        this.tlb_read_user[i] = -1;
        this.tlb_write_user[i] = -1;
    }
    this.tlb_pages_count = 0;
};
CPU_X86.prototype.tlb_flush_all1 = function(la) {
    var i, j, n, ka, ma;
    ka = this.tlb_pages;
    n = this.tlb_pages_count;
    ma = 0;
    for (j = 0; j < n; j++) {
        i = ka[j];
        if (i == la) {
            ka[ma++] = i;
        } else {
            this.tlb_read_kernel[i] = -1;
            this.tlb_write_kernel[i] = -1;
            this.tlb_read_user[i] = -1;
            this.tlb_write_user[i] = -1;
        }
    }
    this.tlb_pages_count = ma;
};
CPU_X86.prototype.write_string = function(fa, na) {
    var i;
    for (i = 0; i < na.length; i++) {
        this.st8_phys(fa++, na.charCodeAt(i) & 0xff);
    }
    this.st8_phys(fa, 0);
};
function oa(ga, n) {
    var i, s;
    var h = "0123456789ABCDEF";
    s = "";
    for (i = n - 1; i >= 0; i--) {
        s = s + h[(ga >>> (i * 4)) & 15];
    }
    return s;
}
function pa(n) {
    return oa(n, 8);
}
function qa(n) {
    return oa(n, 2);
}
function ra(n) {
    return oa(n, 4);
}
CPU_X86.prototype.dump_short = function() {
    console.log(" EIP=" + pa(this.eip) + " EAX=" + pa(this.regs[0]) + " ECX=" + pa(this.regs[1]) + " EDX=" + pa(this.regs[2]) + " EBX=" + pa(this.regs[3]));
    console.log("EFL=" + pa(this.eflags) + " ESP=" + pa(this.regs[4]) + " EBP=" + pa(this.regs[5]) + " ESI=" + pa(this.regs[6]) + " EDI=" + pa(this.regs[7]));
};
CPU_X86.prototype.dump = function() {
    var i, sa, na;
    var ta = [" ES", " CS", " SS", " DS", " FS", " GS", "LDT", " TR"];
    this.dump_short();
    console.log("TSC=" + pa(this.cycle_count) + " OP=" + qa(this.cc_op) + " SRC=" + pa(this.cc_src) + " DST=" + pa(this.cc_dst) + " OP2=" + qa(this.cc_op2) + " DST2=" + pa(this.cc_dst2));
    console.log("CPL=" + this.cpl + " CR0=" + pa(this.cr0) + " CR2=" + pa(this.cr2) + " CR3=" + pa(this.cr3) + " CR4=" + pa(this.cr4));
    na = "";
    for (i = 0; i < 8; i++) {
        if (i == 6) sa = this.ldt;
        else if (i == 7) sa = this.tr;
        else sa = this.segs[i];
        na += ta[i] + "=" + ra(sa.selector) + " " + pa(sa.base) + " " + pa(sa.limit) + " " + ra((sa.flags >> 8) & 0xf0ff);
        if (i & 1) {
            console.log(na);
            na = "";
        } else {
            na += " ";
        }
    }
    sa = this.gdt;
    na = "GDT=     " + pa(sa.base) + " " + pa(sa.limit) + "      ";
    sa = this.idt;
    na += "IDT=     " + pa(sa.base) + " " + pa(sa.limit);
    console.log(na);
};
CPU_X86.prototype.exec_internal = function(ua, va) {
    var wa, fa, xa;
    var ya, za, Aa, Ba, Ca;
    var Da, Ea, Fa, b, Ga, ga, Ha, Ia, Ja, Ka, La, Ma;
    var Na, Oa, Pa, Qa, Ra, Sa;
    var Ta, Ua;
    var Va, Wa;
    var Xa, Ya, Za, ab, bb, cb;
    function db() {
        var eb;
        fb(fa, 0, wa.cpl == 3);
        eb = bb[fa >>> 12] ^ fa;
        return Ta[eb];
    }
    function gb() {
        var Ua;
        return (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
    }
    function hb() {
        var ga;
        ga = gb();
        fa++;
        ga |= gb() << 8;
        fa--;
        return ga;
    }
    function ib() {
        var Ua;
        return (((Ua = bb[fa >>> 12]) | fa) & 1 ? hb() : Va[(fa ^ Ua) >> 1]);
    }
    function jb() {
        var ga;
        ga = gb();
        fa++;
        ga |= gb() << 8;
        fa++;
        ga |= gb() << 16;
        fa++;
        ga |= gb() << 24;
        fa -= 3;
        return ga;
    }
    function kb() {
        var Ua;
        return (((Ua = bb[fa >>> 12]) | fa) & 3 ? jb() : Wa[(fa ^ Ua) >> 2]);
    }
    function lb() {
        var eb;
        fb(fa, 1, wa.cpl == 3);
        eb = cb[fa >>> 12] ^ fa;
        return Ta[eb];
    }
    function mb() {
        var eb;
        return ((eb = cb[fa >>> 12]) == -1) ? lb() : Ta[fa ^ eb];
    }
    function nb() {
        var ga;
        ga = mb();
        fa++;
        ga |= mb() << 8;
        fa--;
        return ga;
    }
    function ob() {
        var eb;
        return ((eb = cb[fa >>> 12]) | fa) & 1 ? nb() : Va[(fa ^ eb) >> 1];
    }
    function pb() {
        var ga;
        ga = mb();
        fa++;
        ga |= mb() << 8;
        fa++;
        ga |= mb() << 16;
        fa++;
        ga |= mb() << 24;
        fa -= 3;
        return ga;
    }
    function qb() {
        var eb;
        return ((eb = cb[fa >>> 12]) | fa) & 3 ? pb() : Wa[(fa ^ eb) >> 2];
    }
    function rb(ga) {
        var eb;
        fb(fa, 1, wa.cpl == 3);
        eb = cb[fa >>> 12] ^ fa;
        Ta[eb] = ga;
    }
    function sb(ga) {
        var Ua; {
            Ua = cb[fa >>> 12];
            if (Ua == -1) {
                rb(ga);
            } else {
                Ta[fa ^ Ua] = ga;
            }
        };
    }
    function tb(ga) {
        sb(ga);
        fa++;
        sb(ga >> 8);
        fa--;
    }
    function ub(ga) {
        var Ua; {
            Ua = cb[fa >>> 12];
            if ((Ua | fa) & 1) {
                tb(ga);
            } else {
                Va[(fa ^ Ua) >> 1] = ga;
            }
        };
    }
    function vb(ga) {
        sb(ga);
        fa++;
        sb(ga >> 8);
        fa++;
        sb(ga >> 16);
        fa++;
        sb(ga >> 24);
        fa -= 3;
    }
    function wb(ga) {
        var Ua; {
            Ua = cb[fa >>> 12];
            if ((Ua | fa) & 3) {
                vb(ga);
            } else {
                Wa[(fa ^ Ua) >> 2] = ga;
            }
        };
    }
    function xb() {
        var eb;
        fb(fa, 0, 0);
        eb = Xa[fa >>> 12] ^ fa;
        return Ta[eb];
    }
    function yb() {
        var eb;
        return ((eb = Xa[fa >>> 12]) == -1) ? xb() : Ta[fa ^ eb];
    }
    function zb() {
        var ga;
        ga = yb();
        fa++;
        ga |= yb() << 8;
        fa--;
        return ga;
    }
    function Ab() {
        var eb;
        return ((eb = Xa[fa >>> 12]) | fa) & 1 ? zb() : Va[(fa ^ eb) >> 1];
    }
    function Bb() {
        var ga;
        ga = yb();
        fa++;
        ga |= yb() << 8;
        fa++;
        ga |= yb() << 16;
        fa++;
        ga |= yb() << 24;
        fa -= 3;
        return ga;
    }
    function Cb() {
        var eb;
        return ((eb = Xa[fa >>> 12]) | fa) & 3 ? Bb() : Wa[(fa ^ eb) >> 2];
    }
    function Db(ga) {
        var eb;
        fb(fa, 1, 0);
        eb = Ya[fa >>> 12] ^ fa;
        Ta[eb] = ga;
    }
    function Eb(ga) {
        var eb;
        eb = Ya[fa >>> 12];
        if (eb == -1) {
            Db(ga);
        } else {
            Ta[fa ^ eb] = ga;
        }
    }
    function Fb(ga) {
        Eb(ga);
        fa++;
        Eb(ga >> 8);
        fa--;
    }
    function Gb(ga) {
        var eb;
        eb = Ya[fa >>> 12];
        if ((eb | fa) & 1) {
            Fb(ga);
        } else {
            Va[(fa ^ eb) >> 1] = ga;
        }
    }
    function Hb(ga) {
        Eb(ga);
        fa++;
        Eb(ga >> 8);
        fa++;
        Eb(ga >> 16);
        fa++;
        Eb(ga >> 24);
        fa -= 3;
    }
    function Ib(ga) {
        var eb;
        eb = Ya[fa >>> 12];
        if ((eb | fa) & 3) {
            Hb(ga);
        } else {
            Wa[(fa ^ eb) >> 2] = ga;
        }
    }
    var Jb, Kb, Lb, Mb, Nb;
    function Ob() {
        var ga, Ha;
        ga = Ta[Kb++];;
        Ha = Ta[Kb++];;
        return ga | (Ha << 8);
    }
    function Pb(Ea) {
        var base, fa, Qb, Rb, Sb, Tb;
        if (Qa && (Da & (0x000f | 0x0080)) == 0) {
            switch ((Ea & 7) | ((Ea >> 3) & 0x18)) {
            case 0x04:
                Qb = Ta[Kb++];;
                base = Qb & 7;
                if (base == 5) {
                    {
                        fa = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                        Kb += 4;
                    };
                } else {
                    fa = xa[base];
                }
                Rb = (Qb >> 3) & 7;
                if (Rb != 4) {
                    fa = (fa + (xa[Rb] << (Qb >> 6))) >> 0;
                }
                break;
            case 0x0c:
                Qb = Ta[Kb++];;
                fa = ((Ta[Kb++] << 24) >> 24);;
                base = Qb & 7;
                fa = (fa + xa[base]) >> 0;
                Rb = (Qb >> 3) & 7;
                if (Rb != 4) {
                    fa = (fa + (xa[Rb] << (Qb >> 6))) >> 0;
                }
                break;
            case 0x14:
                Qb = Ta[Kb++];; {
                    fa = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                    Kb += 4;
                };
                base = Qb & 7;
                fa = (fa + xa[base]) >> 0;
                Rb = (Qb >> 3) & 7;
                if (Rb != 4) {
                    fa = (fa + (xa[Rb] << (Qb >> 6))) >> 0;
                }
                break;
            case 0x05:
                {
                    fa = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                    Kb += 4;
                };
                break;
            case 0x00:
            case 0x01:
            case 0x02:
            case 0x03:
            case 0x06:
            case 0x07:
                base = Ea & 7;
                fa = xa[base];
                break;
            case 0x08:
            case 0x09:
            case 0x0a:
            case 0x0b:
            case 0x0d:
            case 0x0e:
            case 0x0f:
                fa = ((Ta[Kb++] << 24) >> 24);;
                base = Ea & 7;
                fa = (fa + xa[base]) >> 0;
                break;
            case 0x10:
            case 0x11:
            case 0x12:
            case 0x13:
            case 0x15:
            case 0x16:
            case 0x17:
            default:
                {
                    fa = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                    Kb += 4;
                };
                base = Ea & 7;
                fa = (fa + xa[base]) >> 0;
                break;
            }
            return fa;
        } else if (Da & 0x0080) {
            if ((Ea & 0xc7) == 0x06) {
                fa = Ob();
                Tb = 3;
            } else {
                switch (Ea >> 6) {
                case 0:
                    fa = 0;
                    break;
                case 1:
                    fa = ((Ta[Kb++] << 24) >> 24);;
                    break;
                default:
                    fa = Ob();
                    break;
                }
                switch (Ea & 7) {
                case 0:
                    fa = (fa + xa[3] + xa[6]) & 0xffff;
                    Tb = 3;
                    break;
                case 1:
                    fa = (fa + xa[3] + xa[7]) & 0xffff;
                    Tb = 3;
                    break;
                case 2:
                    fa = (fa + xa[5] + xa[6]) & 0xffff;
                    Tb = 2;
                    break;
                case 3:
                    fa = (fa + xa[5] + xa[7]) & 0xffff;
                    Tb = 2;
                    break;
                case 4:
                    fa = (fa + xa[6]) & 0xffff;
                    Tb = 3;
                    break;
                case 5:
                    fa = (fa + xa[7]) & 0xffff;
                    Tb = 3;
                    break;
                case 6:
                    fa = (fa + xa[5]) & 0xffff;
                    Tb = 2;
                    break;
                case 7:
                default:
                    fa = (fa + xa[3]) & 0xffff;
                    Tb = 3;
                    break;
                }
            }
            Sb = Da & 0x000f;
            if (Sb == 0) {
                Sb = Tb;
            } else {
                Sb--;
            }
            fa = (fa + wa.segs[Sb].base) >> 0;
            return fa;
        } else {
            switch ((Ea & 7) | ((Ea >> 3) & 0x18)) {
            case 0x04:
                Qb = Ta[Kb++];;
                base = Qb & 7;
                if (base == 5) {
                    {
                        fa = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                        Kb += 4;
                    };
                    base = 0;
                } else {
                    fa = xa[base];
                }
                Rb = (Qb >> 3) & 7;
                if (Rb != 4) {
                    fa = (fa + (xa[Rb] << (Qb >> 6))) >> 0;
                }
                break;
            case 0x0c:
                Qb = Ta[Kb++];;
                fa = ((Ta[Kb++] << 24) >> 24);;
                base = Qb & 7;
                fa = (fa + xa[base]) >> 0;
                Rb = (Qb >> 3) & 7;
                if (Rb != 4) {
                    fa = (fa + (xa[Rb] << (Qb >> 6))) >> 0;
                }
                break;
            case 0x14:
                Qb = Ta[Kb++];; {
                    fa = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                    Kb += 4;
                };
                base = Qb & 7;
                fa = (fa + xa[base]) >> 0;
                Rb = (Qb >> 3) & 7;
                if (Rb != 4) {
                    fa = (fa + (xa[Rb] << (Qb >> 6))) >> 0;
                }
                break;
            case 0x05:
                {
                    fa = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                    Kb += 4;
                };
                base = 0;
                break;
            case 0x00:
            case 0x01:
            case 0x02:
            case 0x03:
            case 0x06:
            case 0x07:
                base = Ea & 7;
                fa = xa[base];
                break;
            case 0x08:
            case 0x09:
            case 0x0a:
            case 0x0b:
            case 0x0d:
            case 0x0e:
            case 0x0f:
                fa = ((Ta[Kb++] << 24) >> 24);;
                base = Ea & 7;
                fa = (fa + xa[base]) >> 0;
                break;
            case 0x10:
            case 0x11:
            case 0x12:
            case 0x13:
            case 0x15:
            case 0x16:
            case 0x17:
            default:
                {
                    fa = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                    Kb += 4;
                };
                base = Ea & 7;
                fa = (fa + xa[base]) >> 0;
                break;
            }
            Sb = Da & 0x000f;
            if (Sb == 0) {
                if (base == 4 || base == 5) Sb = 2;
                else Sb = 3;
            } else {
                Sb--;
            }
            fa = (fa + wa.segs[Sb].base) >> 0;
            return fa;
        }
    }
    function Ub() {
        var fa, Sb;
        if (Da & 0x0080) {
            fa = Ob();
        } else {
            {
                fa = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                Kb += 4;
            };
        }
        Sb = Da & 0x000f;
        if (Sb == 0) Sb = 3;
        else Sb--;
        fa = (fa + wa.segs[Sb].base) >> 0;
        return fa;
    }
    function Vb(Ga, ga) {
        if (Ga & 4) xa[Ga & 3] = (xa[Ga & 3] & -65281) | ((ga & 0xff) << 8);
        else xa[Ga & 3] = (xa[Ga & 3] & -256) | (ga & 0xff);
    }
    function Wb(Ga, ga) {
        xa[Ga] = (xa[Ga] & -65536) | (ga & 0xffff);
    }
    function Xb(Ja, Yb, Zb) {
        var ac;
        switch (Ja) {
        case 0:
            ya = Zb;
            Yb = (Yb + Zb) >> 0;
            za = Yb;
            Aa = 2;
            break;
        case 1:
            Yb = Yb | Zb;
            za = Yb;
            Aa = 14;
            break;
        case 2:
            ac = bc();
            ya = Zb;
            Yb = (Yb + Zb + ac) >> 0;
            za = Yb;
            Aa = ac ? 5 : 2;
            break;
        case 3:
            ac = bc();
            ya = Zb;
            Yb = (Yb - Zb - ac) >> 0;
            za = Yb;
            Aa = ac ? 11 : 8;
            break;
        case 4:
            Yb = Yb & Zb;
            za = Yb;
            Aa = 14;
            break;
        case 5:
            ya = Zb;
            Yb = (Yb - Zb) >> 0;
            za = Yb;
            Aa = 8;
            break;
        case 6:
            Yb = Yb ^ Zb;
            za = Yb;
            Aa = 14;
            break;
        case 7:
            ya = Zb;
            za = (Yb - Zb) >> 0;
            Aa = 8;
            break;
        default:
            throw "arith32: invalid op";
        }
        return Yb;
    }
    function cc(Ja, Yb, Zb) {
        var ac;
        switch (Ja) {
        case 0:
            ya = Zb;
            Yb = (((Yb + Zb) << 16) >> 16);
            za = Yb;
            Aa = 1;
            break;
        case 1:
            Yb = (((Yb | Zb) << 16) >> 16);
            za = Yb;
            Aa = 13;
            break;
        case 2:
            ac = bc();
            ya = Zb;
            Yb = (((Yb + Zb + ac) << 16) >> 16);
            za = Yb;
            Aa = ac ? 4 : 1;
            break;
        case 3:
            ac = bc();
            ya = Zb;
            Yb = (((Yb - Zb - ac) << 16) >> 16);
            za = Yb;
            Aa = ac ? 10 : 7;
            break;
        case 4:
            Yb = (((Yb & Zb) << 16) >> 16);
            za = Yb;
            Aa = 13;
            break;
        case 5:
            ya = Zb;
            Yb = (((Yb - Zb) << 16) >> 16);
            za = Yb;
            Aa = 7;
            break;
        case 6:
            Yb = (((Yb ^ Zb) << 16) >> 16);
            za = Yb;
            Aa = 13;
            break;
        case 7:
            ya = Zb;
            za = (((Yb - Zb) << 16) >> 16);
            Aa = 7;
            break;
        default:
            throw "arith16: invalid op";
        }
        return Yb;
    }
    function dc(ga) {
        if (Aa < 25) {
            Ba = Aa;
            Ca = za;
        }
        za = (((ga + 1) << 16) >> 16);
        Aa = 26;
        return za;
    }
    function ec(ga) {
        if (Aa < 25) {
            Ba = Aa;
            Ca = za;
        }
        za = (((ga - 1) << 16) >> 16);
        Aa = 29;
        return za;
    }
    function fc(Ja, Yb, Zb) {
        var ac;
        switch (Ja) {
        case 0:
            ya = Zb;
            Yb = (((Yb + Zb) << 24) >> 24);
            za = Yb;
            Aa = 0;
            break;
        case 1:
            Yb = (((Yb | Zb) << 24) >> 24);
            za = Yb;
            Aa = 12;
            break;
        case 2:
            ac = bc();
            ya = Zb;
            Yb = (((Yb + Zb + ac) << 24) >> 24);
            za = Yb;
            Aa = ac ? 3 : 0;
            break;
        case 3:
            ac = bc();
            ya = Zb;
            Yb = (((Yb - Zb - ac) << 24) >> 24);
            za = Yb;
            Aa = ac ? 9 : 6;
            break;
        case 4:
            Yb = (((Yb & Zb) << 24) >> 24);
            za = Yb;
            Aa = 12;
            break;
        case 5:
            ya = Zb;
            Yb = (((Yb - Zb) << 24) >> 24);
            za = Yb;
            Aa = 6;
            break;
        case 6:
            Yb = (((Yb ^ Zb) << 24) >> 24);
            za = Yb;
            Aa = 12;
            break;
        case 7:
            ya = Zb;
            za = (((Yb - Zb) << 24) >> 24);
            Aa = 6;
            break;
        default:
            throw "arith8: invalid op";
        }
        return Yb;
    }
    function gc(ga) {
        if (Aa < 25) {
            Ba = Aa;
            Ca = za;
        }
        za = (((ga + 1) << 24) >> 24);
        Aa = 25;
        return za;
    }
    function hc(ga) {
        if (Aa < 25) {
            Ba = Aa;
            Ca = za;
        }
        za = (((ga - 1) << 24) >> 24);
        Aa = 28;
        return za;
    }
    function ic(Ja, Yb, Zb) {
        var jc, ac;
        switch (Ja) {
        case 0:
            if (Zb & 0x1f) {
                Zb &= 0x7;
                Yb &= 0xff;
                jc = Yb;
                Yb = (Yb << Zb) | (Yb >>> (8 - Zb));
                ya = kc();
                ya |= (Yb & 0x0001) | (((jc ^ Yb) << 4) & 0x0800);
                za = ((ya >> 6) & 1) ^ 1;
                Aa = 24;
            }
            break;
        case 1:
            if (Zb & 0x1f) {
                Zb &= 0x7;
                Yb &= 0xff;
                jc = Yb;
                Yb = (Yb >>> Zb) | (Yb << (8 - Zb));
                ya = kc();
                ya |= ((Yb >> 7) & 0x0001) | (((jc ^ Yb) << 4) & 0x0800);
                za = ((ya >> 6) & 1) ^ 1;
                Aa = 24;
            }
            break;
        case 2:
            Zb = ca[Zb & 0x1f];
            if (Zb) {
                Yb &= 0xff;
                jc = Yb;
                ac = bc();
                Yb = (Yb << Zb) | (ac << (Zb - 1));
                if (Zb > 1) Yb |= jc >>> (9 - Zb);
                ya = kc();
                ya |= (((jc ^ Yb) << 4) & 0x0800) | ((jc >> (8 - Zb)) & 0x0001);
                za = ((ya >> 6) & 1) ^ 1;
                Aa = 24;
            }
            break;
        case 3:
            Zb = ca[Zb & 0x1f];
            if (Zb) {
                Yb &= 0xff;
                jc = Yb;
                ac = bc();
                Yb = (Yb >>> Zb) | (ac << (8 - Zb));
                if (Zb > 1) Yb |= jc << (9 - Zb);
                ya = kc();
                ya |= (((jc ^ Yb) << 4) & 0x0800) | ((jc >> (Zb - 1)) & 0x0001);
                za = ((ya >> 6) & 1) ^ 1;
                Aa = 24;
            }
            break;
        case 4:
        case 6:
            Zb &= 0x1f;
            if (Zb) {
                ya = Yb << (Zb - 1);
                za = Yb = (((Yb << Zb) << 24) >> 24);
                Aa = 15;
            }
            break;
        case 5:
            Zb &= 0x1f;
            if (Zb) {
                Yb &= 0xff;
                ya = Yb >>> (Zb - 1);
                za = Yb = (((Yb >>> Zb) << 24) >> 24);
                Aa = 18;
            }
            break;
        case 7:
            Zb &= 0x1f;
            if (Zb) {
                Yb = (Yb << 24) >> 24;
                ya = Yb >> (Zb - 1);
                za = Yb = (((Yb >> Zb) << 24) >> 24);
                Aa = 18;
            }
            break;
        default:
            throw "unsupported shift8=" + Ja;
        }
        return Yb;
    }
    function lc(Ja, Yb, Zb) {
        var jc, ac;
        switch (Ja) {
        case 0:
            if (Zb & 0x1f) {
                Zb &= 0xf;
                Yb &= 0xffff;
                jc = Yb;
                Yb = (Yb << Zb) | (Yb >>> (16 - Zb));
                ya = kc();
                ya |= (Yb & 0x0001) | (((jc ^ Yb) >> 4) & 0x0800);
                za = ((ya >> 6) & 1) ^ 1;
                Aa = 24;
            }
            break;
        case 1:
            if (Zb & 0x1f) {
                Zb &= 0xf;
                Yb &= 0xffff;
                jc = Yb;
                Yb = (Yb >>> Zb) | (Yb << (16 - Zb));
                ya = kc();
                ya |= ((Yb >> 15) & 0x0001) | (((jc ^ Yb) >> 4) & 0x0800);
                za = ((ya >> 6) & 1) ^ 1;
                Aa = 24;
            }
            break;
        case 2:
            Zb = ba[Zb & 0x1f];
            if (Zb) {
                Yb &= 0xffff;
                jc = Yb;
                ac = bc();
                Yb = (Yb << Zb) | (ac << (Zb - 1));
                if (Zb > 1) Yb |= jc >>> (17 - Zb);
                ya = kc();
                ya |= (((jc ^ Yb) >> 4) & 0x0800) | ((jc >> (16 - Zb)) & 0x0001);
                za = ((ya >> 6) & 1) ^ 1;
                Aa = 24;
            }
            break;
        case 3:
            Zb = ba[Zb & 0x1f];
            if (Zb) {
                Yb &= 0xffff;
                jc = Yb;
                ac = bc();
                Yb = (Yb >>> Zb) | (ac << (16 - Zb));
                if (Zb > 1) Yb |= jc << (17 - Zb);
                ya = kc();
                ya |= (((jc ^ Yb) >> 4) & 0x0800) | ((jc >> (Zb - 1)) & 0x0001);
                za = ((ya >> 6) & 1) ^ 1;
                Aa = 24;
            }
            break;
        case 4:
        case 6:
            Zb &= 0x1f;
            if (Zb) {
                ya = Yb << (Zb - 1);
                za = Yb = (((Yb << Zb) << 16) >> 16);
                Aa = 16;
            }
            break;
        case 5:
            Zb &= 0x1f;
            if (Zb) {
                Yb &= 0xffff;
                ya = Yb >>> (Zb - 1);
                za = Yb = (((Yb >>> Zb) << 16) >> 16);
                Aa = 19;
            }
            break;
        case 7:
            Zb &= 0x1f;
            if (Zb) {
                Yb = (Yb << 16) >> 16;
                ya = Yb >> (Zb - 1);
                za = Yb = (((Yb >> Zb) << 16) >> 16);
                Aa = 19;
            }
            break;
        default:
            throw "unsupported shift16=" + Ja;
        }
        return Yb;
    }
    function mc(Ja, Yb, Zb) {
        var jc, ac;
        switch (Ja) {
        case 0:
            Zb &= 0x1f;
            if (Zb) {
                jc = Yb;
                Yb = (Yb << Zb) | (Yb >>> (32 - Zb));
                ya = kc();
                ya |= (Yb & 0x0001) | (((jc ^ Yb) >> 20) & 0x0800);
                za = ((ya >> 6) & 1) ^ 1;
                Aa = 24;
            }
            break;
        case 1:
            Zb &= 0x1f;
            if (Zb) {
                jc = Yb;
                Yb = (Yb >>> Zb) | (Yb << (32 - Zb));
                ya = kc();
                ya |= ((Yb >> 31) & 0x0001) | (((jc ^ Yb) >> 20) & 0x0800);
                za = ((ya >> 6) & 1) ^ 1;
                Aa = 24;
            }
            break;
        case 2:
            Zb &= 0x1f;
            if (Zb) {
                jc = Yb;
                ac = bc();
                Yb = (Yb << Zb) | (ac << (Zb - 1));
                if (Zb > 1) Yb |= jc >>> (33 - Zb);
                ya = kc();
                ya |= (((jc ^ Yb) >> 20) & 0x0800) | ((jc >> (32 - Zb)) & 0x0001);
                za = ((ya >> 6) & 1) ^ 1;
                Aa = 24;
            }
            break;
        case 3:
            Zb &= 0x1f;
            if (Zb) {
                jc = Yb;
                ac = bc();
                Yb = (Yb >>> Zb) | (ac << (32 - Zb));
                if (Zb > 1) Yb |= jc << (33 - Zb);
                ya = kc();
                ya |= (((jc ^ Yb) >> 20) & 0x0800) | ((jc >> (Zb - 1)) & 0x0001);
                za = ((ya >> 6) & 1) ^ 1;
                Aa = 24;
            }
            break;
        case 4:
        case 6:
            Zb &= 0x1f;
            if (Zb) {
                ya = Yb << (Zb - 1);
                za = Yb = Yb << Zb;
                Aa = 17;
            }
            break;
        case 5:
            Zb &= 0x1f;
            if (Zb) {
                ya = Yb >>> (Zb - 1);
                za = Yb = Yb >>> Zb;
                Aa = 20;
            }
            break;
        case 7:
            Zb &= 0x1f;
            if (Zb) {
                ya = Yb >> (Zb - 1);
                za = Yb = Yb >> Zb;
                Aa = 20;
            }
            break;
        default:
            throw "unsupported shift32=" + Ja;
        }
        return Yb;
    }
    function nc(Ja, Yb, Zb, oc) {
        var pc;
        oc &= 0x1f;
        if (oc) {
            if (Ja == 0) {
                Zb &= 0xffff;
                pc = Zb | (Yb << 16);
                ya = pc >> (32 - oc);
                pc <<= oc;
                if (oc > 16) pc |= Zb << (oc - 16);
                Yb = za = pc >> 16;
                Aa = 19;
            } else {
                pc = (Yb & 0xffff) | (Zb << 16);
                ya = pc >> (oc - 1);
                pc >>= oc;
                if (oc > 16) pc |= Zb << (32 - oc);
                Yb = za = (((pc) << 16) >> 16);
                Aa = 19;
            }
        }
        return Yb;
    }
    function qc(Yb, Zb, oc) {
        oc &= 0x1f;
        if (oc) {
            ya = Yb << (oc - 1);
            za = Yb = (Yb << oc) | (Zb >>> (32 - oc));
            Aa = 17;
        }
        return Yb;
    }
    function rc(Yb, Zb, oc) {
        oc &= 0x1f;
        if (oc) {
            ya = Yb >> (oc - 1);
            za = Yb = (Yb >>> oc) | (Zb << (32 - oc));
            Aa = 20;
        }
        return Yb;
    }
    function sc(Yb, Zb) {
        Zb &= 0xf;
        ya = Yb >> Zb;
        Aa = 19;
    }
    function tc(Yb, Zb) {
        Zb &= 0x1f;
        ya = Yb >> Zb;
        Aa = 20;
    }
    function uc(Ja, Yb, Zb) {
        var vc;
        Zb &= 0xf;
        ya = Yb >> Zb;
        vc = 1 << Zb;
        switch (Ja) {
        case 1:
            Yb |= vc;
            break;
        case 2:
            Yb &= ~vc;
            break;
        case 3:
        default:
            Yb ^= vc;
            break;
        }
        Aa = 19;
        return Yb;
    }
    function wc(Ja, Yb, Zb) {
        var vc;
        Zb &= 0x1f;
        ya = Yb >> Zb;
        vc = 1 << Zb;
        switch (Ja) {
        case 1:
            Yb |= vc;
            break;
        case 2:
            Yb &= ~vc;
            break;
        case 3:
        default:
            Yb ^= vc;
            break;
        }
        Aa = 20;
        return Yb;
    }
    function xc(Yb, Zb) {
        Zb &= 0xffff;
        if (Zb) {
            Yb = 0;
            while ((Zb & 1) == 0) {
                Yb++;
                Zb >>= 1;
            }
            za = 1;
        } else {
            za = 0;
        }
        Aa = 14;
        return Yb;
    }
    function yc(Yb, Zb) {
        if (Zb) {
            Yb = 0;
            while ((Zb & 1) == 0) {
                Yb++;
                Zb >>= 1;
            }
            za = 1;
        } else {
            za = 0;
        }
        Aa = 14;
        return Yb;
    }
    function zc(Yb, Zb) {
        Zb &= 0xffff;
        if (Zb) {
            Yb = 15;
            while ((Zb & 0x8000) == 0) {
                Yb--;
                Zb <<= 1;
            }
            za = 1;
        } else {
            za = 0;
        }
        Aa = 14;
        return Yb;
    }
    function Ac(Yb, Zb) {
        if (Zb) {
            Yb = 31;
            while (Zb >= 0) {
                Yb--;
                Zb <<= 1;
            }
            za = 1;
        } else {
            za = 0;
        }
        Aa = 14;
        return Yb;
    }
    function Bc(b) {
        var a, q, r;
        a = xa[0] & 0xffff;
        b &= 0xff;
        if ((a >> 8) >= b) Cc(0);
        q = (a / b) >> 0;
        r = (a % b);
        Wb(0, (q & 0xff) | (r << 8));
    }
    function Dc(b) {
        var a, q, r;
        a = (xa[0] << 16) >> 16;
        b = (b << 24) >> 24;
        if (b == 0) Cc(0);
        q = (a / b) >> 0;
        if (((q << 24) >> 24) != q) Cc(0);
        r = (a % b);
        Wb(0, (q & 0xff) | (r << 8));
    }
    function Ec(b) {
        var a, q, r;
        a = (xa[2] << 16) | (xa[0] & 0xffff);
        b &= 0xffff;
        if ((a >>> 16) >= b) Cc(0);
        q = (a / b) >> 0;
        r = (a % b);
        Wb(0, q);
        Wb(2, r);
    }
    function Fc(b) {
        var a, q, r;
        a = (xa[2] << 16) | (xa[0] & 0xffff);
        b = (b << 16) >> 16;
        if (b == 0) Cc(0);
        q = (a / b) >> 0;
        if (((q << 16) >> 16) != q) Cc(0);
        r = (a % b);
        Wb(0, q);
        Wb(2, r);
    }
    function Gc(Hc, Ic, b) {
        var a, i, Jc;
        Hc = Hc >>> 0;
        Ic = Ic >>> 0;
        b = b >>> 0;
        if (Hc >= b) {
            Cc(0);
        }
        if (Hc >= 0 && Hc <= 0x200000) {
            a = Hc * 4294967296 + Ic;
            Ma = (a % b) >> 0;
            return (a / b) >> 0;
        } else {
            for (i = 0; i < 32; i++) {
                Jc = Hc >> 31;
                Hc = ((Hc << 1) | (Ic >>> 31)) >>> 0;
                if (Jc || Hc >= b) {
                    Hc = Hc - b;
                    Ic = (Ic << 1) | 1;
                } else {
                    Ic = Ic << 1;
                }
            }
            Ma = Hc >> 0;
            return Ic;
        }
    }
    function Kc(Hc, Ic, b) {
        var Lc, Mc, q;
        if (Hc < 0) {
            Lc = 1;
            Hc = ~Hc;
            Ic = ( - Ic) >> 0;
            if (Ic == 0) Hc = (Hc + 1) >> 0;
        } else {
            Lc = 0;
        }
        if (b < 0) {
            b = ( - b) >> 0;
            Mc = 1;
        } else {
            Mc = 0;
        }
        q = Gc(Hc, Ic, b);
        Mc ^= Lc;
        if (Mc) {
            if ((q >>> 0) > 0x80000000) Cc(0);
            q = ( - q) >> 0;
        } else {
            if ((q >>> 0) >= 0x80000000) Cc(0);
        }
        if (Lc) {
            Ma = ( - Ma) >> 0;
        }
        return q;
    }
    function Nc(a, b) {
        var pc;
        a &= 0xff;
        b &= 0xff;
        pc = (a * b) >> 0;
        ya = pc >> 8;
        za = (((pc) << 24) >> 24);
        Aa = 21;
        return pc;
    }
    function Oc(a, b) {
        var pc;
        a = (((a) << 24) >> 24);
        b = (((b) << 24) >> 24);
        pc = (a * b) >> 0;
        za = (((pc) << 24) >> 24);
        ya = (pc != za) >> 0;
        Aa = 21;
        return pc;
    }
    function Pc(a, b) {
        var pc;
        a &= 0xffff;
        b &= 0xffff;
        pc = (a * b) >> 0;
        ya = pc >>> 16;
        za = (((pc) << 16) >> 16);
        Aa = 22;
        return pc;
    }
    function Qc(a, b) {
        var pc;
        a = (a << 16) >> 16;
        b = (b << 16) >> 16;
        pc = (a * b) >> 0;
        za = (((pc) << 16) >> 16);
        ya = (pc != za) >> 0;
        Aa = 22;
        return pc;
    }
    function Rc(a, b) {
        var r, Ic, Hc, Sc, Tc, m;
        a = a >>> 0;
        b = b >>> 0;
        r = a * b;
        if (r <= 0xffffffff) {
            Ma = 0;
            r &= -1;
        } else {
            Ic = a & 0xffff;
            Hc = a >>> 16;
            Sc = b & 0xffff;
            Tc = b >>> 16;
            r = Ic * Sc;
            Ma = Hc * Tc;
            m = Ic * Tc;
            r += (((m & 0xffff) << 16) >>> 0);
            Ma += (m >>> 16);
            if (r >= 4294967296) {
                r -= 4294967296;
                Ma++;
            }
            m = Hc * Sc;
            r += (((m & 0xffff) << 16) >>> 0);
            Ma += (m >>> 16);
            if (r >= 4294967296) {
                r -= 4294967296;
                Ma++;
            }
            r &= -1;
            Ma &= -1;
        }
        return r;
    }
    function Uc(a, b) {
        za = Rc(a, b);
        ya = Ma;
        Aa = 23;
        return za;
    }
    function Vc(a, b) {
        var s, r;
        s = 0;
        if (a < 0) {
            a = -a;
            s = 1;
        }
        if (b < 0) {
            b = -b;
            s ^= 1;
        }
        r = Rc(a, b);
        if (s) {
            Ma = ~Ma;
            r = ( - r) >> 0;
            if (r == 0) {
                Ma = (Ma + 1) >> 0;
            }
        }
        za = r;
        ya = (Ma - (r >> 31)) >> 0;
        Aa = 23;
        return r;
    }
    function bc() {
        var Yb, pc, Wc, Xc;
        if (Aa >= 25) {
            Wc = Ba;
            Xc = Ca;
        } else {
            Wc = Aa;
            Xc = za;
        }
        switch (Wc) {
        case 0:
            pc = (Xc & 0xff) < (ya & 0xff);
            break;
        case 1:
            pc = (Xc & 0xffff) < (ya & 0xffff);
            break;
        case 2:
            pc = (Xc >>> 0) < (ya >>> 0);
            break;
        case 3:
            pc = (Xc & 0xff) <= (ya & 0xff);
            break;
        case 4:
            pc = (Xc & 0xffff) <= (ya & 0xffff);
            break;
        case 5:
            pc = (Xc >>> 0) <= (ya >>> 0);
            break;
        case 6:
            pc = ((Xc + ya) & 0xff) < (ya & 0xff);
            break;
        case 7:
            pc = ((Xc + ya) & 0xffff) < (ya & 0xffff);
            break;
        case 8:
            pc = ((Xc + ya) >>> 0) < (ya >>> 0);
            break;
        case 9:
            Yb = (Xc + ya + 1) & 0xff;
            pc = Yb <= (ya & 0xff);
            break;
        case 10:
            Yb = (Xc + ya + 1) & 0xffff;
            pc = Yb <= (ya & 0xffff);
            break;
        case 11:
            Yb = (Xc + ya + 1) >>> 0;
            pc = Yb <= (ya >>> 0);
            break;
        case 12:
        case 13:
        case 14:
            pc = 0;
            break;
        case 15:
            pc = (ya >> 7) & 1;
            break;
        case 16:
            pc = (ya >> 15) & 1;
            break;
        case 17:
            pc = (ya >> 31) & 1;
            break;
        case 18:
        case 19:
        case 20:
            pc = ya & 1;
            break;
        case 21:
        case 22:
        case 23:
            pc = ya != 0;
            break;
        case 24:
            pc = ya & 1;
            break;
        default:
            throw "GET_CARRY: unsupported cc_op=" + Aa;
        }
        return pc;
    }
    function Yc() {
        var pc, Yb;
        switch (Aa) {
        case 0:
            Yb = (za - ya) >> 0;
            pc = (((Yb ^ ya ^ -1) & (Yb ^ za)) >> 7) & 1;
            break;
        case 1:
            Yb = (za - ya) >> 0;
            pc = (((Yb ^ ya ^ -1) & (Yb ^ za)) >> 15) & 1;
            break;
        case 2:
            Yb = (za - ya) >> 0;
            pc = (((Yb ^ ya ^ -1) & (Yb ^ za)) >> 31) & 1;
            break;
        case 3:
            Yb = (za - ya - 1) >> 0;
            pc = (((Yb ^ ya ^ -1) & (Yb ^ za)) >> 7) & 1;
            break;
        case 4:
            Yb = (za - ya - 1) >> 0;
            pc = (((Yb ^ ya ^ -1) & (Yb ^ za)) >> 15) & 1;
            break;
        case 5:
            Yb = (za - ya - 1) >> 0;
            pc = (((Yb ^ ya ^ -1) & (Yb ^ za)) >> 31) & 1;
            break;
        case 6:
            Yb = (za + ya) >> 0;
            pc = (((Yb ^ ya) & (Yb ^ za)) >> 7) & 1;
            break;
        case 7:
            Yb = (za + ya) >> 0;
            pc = (((Yb ^ ya) & (Yb ^ za)) >> 15) & 1;
            break;
        case 8:
            Yb = (za + ya) >> 0;
            pc = (((Yb ^ ya) & (Yb ^ za)) >> 31) & 1;
            break;
        case 9:
            Yb = (za + ya + 1) >> 0;
            pc = (((Yb ^ ya) & (Yb ^ za)) >> 7) & 1;
            break;
        case 10:
            Yb = (za + ya + 1) >> 0;
            pc = (((Yb ^ ya) & (Yb ^ za)) >> 15) & 1;
            break;
        case 11:
            Yb = (za + ya + 1) >> 0;
            pc = (((Yb ^ ya) & (Yb ^ za)) >> 31) & 1;
            break;
        case 12:
        case 13:
        case 14:
            pc = 0;
            break;
        case 15:
        case 18:
            pc = ((ya ^ za) >> 7) & 1;
            break;
        case 16:
        case 19:
            pc = ((ya ^ za) >> 15) & 1;
            break;
        case 17:
        case 20:
            pc = ((ya ^ za) >> 31) & 1;
            break;
        case 21:
        case 22:
        case 23:
            pc = ya != 0;
            break;
        case 24:
            pc = (ya >> 11) & 1;
            break;
        case 25:
            pc = (za & 0xff) == 0x80;
            break;
        case 26:
            pc = (za & 0xffff) == 0x8000;
            break;
        case 27:
            pc = (za == -2147483648);
            break;
        case 28:
            pc = (za & 0xff) == 0x7f;
            break;
        case 29:
            pc = (za & 0xffff) == 0x7fff;
            break;
        case 30:
            pc = za == 0x7fffffff;
            break;
        default:
            throw "JO: unsupported cc_op=" + Aa;
        }
        return pc;
    }
    function Zc() {
        var pc;
        switch (Aa) {
        case 6:
            pc = ((za + ya) & 0xff) <= (ya & 0xff);
            break;
        case 7:
            pc = ((za + ya) & 0xffff) <= (ya & 0xffff);
            break;
        case 8:
            pc = ((za + ya) >>> 0) <= (ya >>> 0);
            break;
        case 24:
            pc = (ya & (0x0040 | 0x0001)) != 0;
            break;
        default:
            pc = bc() | (za == 0);
            break;
        }
        return pc;
    }
    function ad() {
        if (Aa == 24) {
            return (ya >> 2) & 1;
        } else {
            return aa[za & 0xff];
        }
    }
    function bd() {
        var pc;
        switch (Aa) {
        case 6:
            pc = ((za + ya) << 24) < (ya << 24);
            break;
        case 7:
            pc = ((za + ya) << 16) < (ya << 16);
            break;
        case 8:
            pc = ((za + ya) >> 0) < ya;
            break;
        case 12:
        case 25:
        case 28:
        case 13:
        case 26:
        case 29:
        case 14:
        case 27:
        case 30:
            pc = za < 0;
            break;
        case 24:
            pc = ((ya >> 7) ^ (ya >> 11)) & 1;
            break;
        default:
            pc = (Aa == 24 ? ((ya >> 7) & 1) : (za < 0)) ^ Yc();
            break;
        }
        return pc;
    }
    function cd() {
        var pc;
        switch (Aa) {
        case 6:
            pc = ((za + ya) << 24) <= (ya << 24);
            break;
        case 7:
            pc = ((za + ya) << 16) <= (ya << 16);
            break;
        case 8:
            pc = ((za + ya) >> 0) <= ya;
            break;
        case 12:
        case 25:
        case 28:
        case 13:
        case 26:
        case 29:
        case 14:
        case 27:
        case 30:
            pc = za <= 0;
            break;
        case 24:
            pc = (((ya >> 7) ^ (ya >> 11)) | (ya >> 6)) & 1;
            break;
        default:
            pc = ((Aa == 24 ? ((ya >> 7) & 1) : (za < 0)) ^ Yc()) | (za == 0);
            break;
        }
        return pc;
    }
    function dd() {
        var Yb, pc;
        switch (Aa) {
        case 0:
        case 1:
        case 2:
            Yb = (za - ya) >> 0;
            pc = (za ^ Yb ^ ya) & 0x10;
            break;
        case 3:
        case 4:
        case 5:
            Yb = (za - ya - 1) >> 0;
            pc = (za ^ Yb ^ ya) & 0x10;
            break;
        case 6:
        case 7:
        case 8:
            Yb = (za + ya) >> 0;
            pc = (za ^ Yb ^ ya) & 0x10;
            break;
        case 9:
        case 10:
        case 11:
            Yb = (za + ya + 1) >> 0;
            pc = (za ^ Yb ^ ya) & 0x10;
            break;
        case 12:
        case 13:
        case 14:
            pc = 0;
            break;
        case 15:
        case 18:
        case 16:
        case 19:
        case 17:
        case 20:
        case 21:
        case 22:
        case 23:
            pc = 0;
            break;
        case 24:
            pc = ya & 0x10;
            break;
        case 25:
        case 26:
        case 27:
            pc = (za ^ (za - 1)) & 0x10;
            break;
        case 28:
        case 29:
        case 30:
            pc = (za ^ (za + 1)) & 0x10;
            break;
        default:
            throw "AF: unsupported cc_op=" + Aa;
        }
        return pc;
    }
    function ed(fd) {
        var pc;
        switch (fd >> 1) {
        case 0:
            pc = Yc();
            break;
        case 1:
            pc = bc();
            break;
        case 2:
            pc = (za == 0);
            break;
        case 3:
            pc = Zc();
            break;
        case 4:
            pc = (Aa == 24 ? ((ya >> 7) & 1) : (za < 0));
            break;
        case 5:
            pc = ad();
            break;
        case 6:
            pc = bd();
            break;
        case 7:
            pc = cd();
            break;
        default:
            throw "unsupported cond: " + fd;
        }
        return pc ^ (fd & 1);
    }
    function kc() {
        return (ad() << 2) | ((za == 0) << 6) | ((Aa == 24 ? ((ya >> 7) & 1) : (za < 0)) << 7) | dd();
    }
    function gd() {
        return (bc() << 0) | (ad() << 2) | ((za == 0) << 6) | ((Aa == 24 ? ((ya >> 7) & 1) : (za < 0)) << 7) | (Yc() << 11) | dd();
    }
    function hd() {
        var id;
        id = gd();
        id |= wa.df & 0x00000400;
        id |= wa.eflags;
        return id;
    }
    function jd(id, kd) {
        ya = id & (0x0800 | 0x0080 | 0x0040 | 0x0010 | 0x0004 | 0x0001);
        za = ((ya >> 6) & 1) ^ 1;
        Aa = 24;
        wa.df = 1 - (2 * ((id >> 10) & 1));
        wa.eflags = (wa.eflags & ~kd) | (id & kd);
    }
    function ld() {
        return wa.cycle_count + (ua - Ka);
    }
    function md(na) {
        throw "CPU abort: " + na;
    }
    function nd() {
        wa.eip = Jb;
        wa.cc_src = ya;
        wa.cc_dst = za;
        wa.cc_op = Aa;
        wa.cc_op2 = Ba;
        wa.cc_dst2 = Ca;
        wa.dump();
    }
    function od() {
        wa.eip = Jb;
        wa.cc_src = ya;
        wa.cc_dst = za;
        wa.cc_op = Aa;
        wa.cc_op2 = Ba;
        wa.cc_dst2 = Ca;
        wa.dump_short();
    }
    function pd(intno, error_code) {
        wa.cycle_count += (ua - Ka);
        wa.eip = Jb;
        wa.cc_src = ya;
        wa.cc_dst = za;
        wa.cc_op = Aa;
        wa.cc_op2 = Ba;
        wa.cc_dst2 = Ca;
        throw {
            intno: intno,
            error_code: error_code
        };
    }
    function Cc(intno) {
        pd(intno, 0);
    }
    function qd(rd) {
        wa.cpl = rd;
        if (wa.cpl == 3) {
            bb = Za;
            cb = ab;
        } else {
            bb = Xa;
            cb = Ya;
        }
    }
    function sd(fa, td) {
        var eb;
        if (td) {
            eb = cb[fa >>> 12];
        } else {
            eb = bb[fa >>> 12];
        }
        if (eb == -1) {
            fb(fa, td, wa.cpl == 3);
            if (td) {
                eb = cb[fa >>> 12];
            } else {
                eb = bb[fa >>> 12];
            }
        }
        return eb ^ fa;
    }
    function ud(ga) {
        var vd;
        vd = xa[4] - 2;
        fa = ((vd & Pa) + Oa) >> 0;
        ub(ga);
        xa[4] = (xa[4] & ~Pa) | ((vd) & Pa);
    }
    function wd(ga) {
        var vd;
        vd = xa[4] - 4;
        fa = ((vd & Pa) + Oa) >> 0;
        wb(ga);
        xa[4] = (xa[4] & ~Pa) | ((vd) & Pa);
    }
    function xd() {
        fa = ((xa[4] & Pa) + Oa) >> 0;
        return ib();
    }
    function yd() {
        xa[4] = (xa[4] & ~Pa) | ((xa[4] + 2) & Pa);
    }
    function zd() {
        fa = ((xa[4] & Pa) + Oa) >> 0;
        return kb();
    }
    function Ad() {
        xa[4] = (xa[4] & ~Pa) | ((xa[4] + 4) & Pa);
    }
    function Bd(Nb, b) {
        var n, Da, l, Ea, Cd, base, Ja, Dd;
        n = 1;
        Da = Ra;
        if (Da & 0x0100) Dd = 2;
        else Dd = 4;
        Ed: for (;;) {
            switch (b) {
            case 0x66:
                if (Ra & 0x0100) {
                    Dd = 4;
                    Da &= ~0x0100;
                } else {
                    Dd = 2;
                    Da |= 0x0100;
                }
            case 0xf0:
            case 0xf2:
            case 0xf3:
            case 0x26:
            case 0x2e:
            case 0x36:
            case 0x3e:
            case 0x64:
            case 0x65:
                {
                    if ((n + 1) > 15) Cc(6);
                    fa = (Nb + (n++)) >> 0;
                    b = (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
                };
                break;
            case 0x67:
                if (Ra & 0x0080) {
                    Da &= ~0x0080;
                } else {
                    Da |= 0x0080;
                } {
                    if ((n + 1) > 15) Cc(6);
                    fa = (Nb + (n++)) >> 0;
                    b = (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
                };
                break;
            case 0x91:
            case 0x92:
            case 0x93:
            case 0x94:
            case 0x95:
            case 0x96:
            case 0x97:
            case 0x40:
            case 0x41:
            case 0x42:
            case 0x43:
            case 0x44:
            case 0x45:
            case 0x46:
            case 0x47:
            case 0x48:
            case 0x49:
            case 0x4a:
            case 0x4b:
            case 0x4c:
            case 0x4d:
            case 0x4e:
            case 0x4f:
            case 0x50:
            case 0x51:
            case 0x52:
            case 0x53:
            case 0x54:
            case 0x55:
            case 0x56:
            case 0x57:
            case 0x58:
            case 0x59:
            case 0x5a:
            case 0x5b:
            case 0x5c:
            case 0x5d:
            case 0x5e:
            case 0x5f:
            case 0x98:
            case 0x99:
            case 0xc9:
            case 0x9c:
            case 0x9d:
            case 0x06:
            case 0x0e:
            case 0x16:
            case 0x1e:
            case 0x07:
            case 0x17:
            case 0x1f:
            case 0xc3:
            case 0xcb:
            case 0x90:
            case 0xcc:
            case 0xce:
            case 0xcf:
            case 0xf5:
            case 0xf8:
            case 0xf9:
            case 0xfc:
            case 0xfd:
            case 0xfa:
            case 0xfb:
            case 0x9e:
            case 0x9f:
            case 0xf4:
            case 0xa4:
            case 0xa5:
            case 0xaa:
            case 0xab:
            case 0xa6:
            case 0xa7:
            case 0xac:
            case 0xad:
            case 0xae:
            case 0xaf:
            case 0x9b:
            case 0xec:
            case 0xed:
            case 0xee:
            case 0xef:
            case 0xd7:
            case 0x27:
            case 0x2f:
            case 0x37:
            case 0x3f:
            case 0x60:
            case 0x61:
            case 0x6c:
            case 0x6d:
            case 0x6e:
            case 0x6f:
                break Ed;
            case 0xb0:
            case 0xb1:
            case 0xb2:
            case 0xb3:
            case 0xb4:
            case 0xb5:
            case 0xb6:
            case 0xb7:
            case 0x04:
            case 0x0c:
            case 0x14:
            case 0x1c:
            case 0x24:
            case 0x2c:
            case 0x34:
            case 0x3c:
            case 0xa8:
            case 0x6a:
            case 0xeb:
            case 0x70:
            case 0x71:
            case 0x72:
            case 0x73:
            case 0x76:
            case 0x77:
            case 0x78:
            case 0x79:
            case 0x7a:
            case 0x7b:
            case 0x7c:
            case 0x7d:
            case 0x7e:
            case 0x7f:
            case 0x74:
            case 0x75:
            case 0xe0:
            case 0xe1:
            case 0xe2:
            case 0xe3:
            case 0xcd:
            case 0xe4:
            case 0xe5:
            case 0xe6:
            case 0xe7:
            case 0xd4:
            case 0xd5:
                n++;
                if (n > 15) Cc(6);
                break Ed;
            case 0xb8:
            case 0xb9:
            case 0xba:
            case 0xbb:
            case 0xbc:
            case 0xbd:
            case 0xbe:
            case 0xbf:
            case 0x05:
            case 0x0d:
            case 0x15:
            case 0x1d:
            case 0x25:
            case 0x2d:
            case 0x35:
            case 0x3d:
            case 0xa9:
            case 0x68:
            case 0xe9:
            case 0xe8:
                n += Dd;
                if (n > 15) Cc(6);
                break Ed;
            case 0x88:
            case 0x89:
            case 0x8a:
            case 0x8b:
            case 0x86:
            case 0x87:
            case 0x8e:
            case 0x8c:
            case 0xc4:
            case 0xc5:
            case 0x00:
            case 0x08:
            case 0x10:
            case 0x18:
            case 0x20:
            case 0x28:
            case 0x30:
            case 0x38:
            case 0x01:
            case 0x09:
            case 0x11:
            case 0x19:
            case 0x21:
            case 0x29:
            case 0x31:
            case 0x39:
            case 0x02:
            case 0x0a:
            case 0x12:
            case 0x1a:
            case 0x22:
            case 0x2a:
            case 0x32:
            case 0x3a:
            case 0x03:
            case 0x0b:
            case 0x13:
            case 0x1b:
            case 0x23:
            case 0x2b:
            case 0x33:
            case 0x3b:
            case 0x84:
            case 0x85:
            case 0xd0:
            case 0xd1:
            case 0xd2:
            case 0xd3:
            case 0x8f:
            case 0x8d:
            case 0xfe:
            case 0xff:
            case 0xd8:
            case 0xd9:
            case 0xda:
            case 0xdb:
            case 0xdc:
            case 0xdd:
            case 0xde:
            case 0xdf:
            case 0x62:
            case 0x63:
                {
                    {
                        if ((n + 1) > 15) Cc(6);
                        fa = (Nb + (n++)) >> 0;
                        Ea = (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
                    };
                    if (Da & 0x0080) {
                        switch (Ea >> 6) {
                        case 0:
                            if ((Ea & 7) == 6) n += 2;
                            break;
                        case 1:
                            n++;
                            break;
                        case 2:
                            n += 2;
                            break;
                        case 3:
                        default:
                            break;
                        }
                    } else {
                        switch ((Ea & 7) | ((Ea >> 3) & 0x18)) {
                        case 0x04:
                            {
                                if ((n + 1) > 15) Cc(6);
                                fa = (Nb + (n++)) >> 0;
                                Cd = (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
                            };
                            if ((Cd & 7) == 5) {
                                n += 4;
                            }
                            break;
                        case 0x0c:
                            n += 2;
                            break;
                        case 0x14:
                            n += 5;
                            break;
                        case 0x05:
                            n += 4;
                            break;
                        case 0x00:
                        case 0x01:
                        case 0x02:
                        case 0x03:
                        case 0x06:
                        case 0x07:
                            break;
                        case 0x08:
                        case 0x09:
                        case 0x0a:
                        case 0x0b:
                        case 0x0d:
                        case 0x0e:
                        case 0x0f:
                            n++;
                            break;
                        case 0x10:
                        case 0x11:
                        case 0x12:
                        case 0x13:
                        case 0x15:
                        case 0x16:
                        case 0x17:
                            n += 4;
                            break;
                        }
                    }
                    if (n > 15) Cc(6);
                };
                break Ed;
            case 0xa0:
            case 0xa1:
            case 0xa2:
            case 0xa3:
                if (Da & 0x0100) n += 2;
                else n += 4;
                if (n > 15) Cc(6);
                break Ed;
            case 0xc6:
            case 0x80:
            case 0x82:
            case 0x83:
            case 0x6b:
            case 0xc0:
            case 0xc1:
                {
                    {
                        if ((n + 1) > 15) Cc(6);
                        fa = (Nb + (n++)) >> 0;
                        Ea = (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
                    };
                    if (Da & 0x0080) {
                        switch (Ea >> 6) {
                        case 0:
                            if ((Ea & 7) == 6) n += 2;
                            break;
                        case 1:
                            n++;
                            break;
                        case 2:
                            n += 2;
                            break;
                        case 3:
                        default:
                            break;
                        }
                    } else {
                        switch ((Ea & 7) | ((Ea >> 3) & 0x18)) {
                        case 0x04:
                            {
                                if ((n + 1) > 15) Cc(6);
                                fa = (Nb + (n++)) >> 0;
                                Cd = (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
                            };
                            if ((Cd & 7) == 5) {
                                n += 4;
                            }
                            break;
                        case 0x0c:
                            n += 2;
                            break;
                        case 0x14:
                            n += 5;
                            break;
                        case 0x05:
                            n += 4;
                            break;
                        case 0x00:
                        case 0x01:
                        case 0x02:
                        case 0x03:
                        case 0x06:
                        case 0x07:
                            break;
                        case 0x08:
                        case 0x09:
                        case 0x0a:
                        case 0x0b:
                        case 0x0d:
                        case 0x0e:
                        case 0x0f:
                            n++;
                            break;
                        case 0x10:
                        case 0x11:
                        case 0x12:
                        case 0x13:
                        case 0x15:
                        case 0x16:
                        case 0x17:
                            n += 4;
                            break;
                        }
                    }
                    if (n > 15) Cc(6);
                };
                n++;
                if (n > 15) Cc(6);
                break Ed;
            case 0xc7:
            case 0x81:
            case 0x69:
                {
                    {
                        if ((n + 1) > 15) Cc(6);
                        fa = (Nb + (n++)) >> 0;
                        Ea = (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
                    };
                    if (Da & 0x0080) {
                        switch (Ea >> 6) {
                        case 0:
                            if ((Ea & 7) == 6) n += 2;
                            break;
                        case 1:
                            n++;
                            break;
                        case 2:
                            n += 2;
                            break;
                        case 3:
                        default:
                            break;
                        }
                    } else {
                        switch ((Ea & 7) | ((Ea >> 3) & 0x18)) {
                        case 0x04:
                            {
                                if ((n + 1) > 15) Cc(6);
                                fa = (Nb + (n++)) >> 0;
                                Cd = (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
                            };
                            if ((Cd & 7) == 5) {
                                n += 4;
                            }
                            break;
                        case 0x0c:
                            n += 2;
                            break;
                        case 0x14:
                            n += 5;
                            break;
                        case 0x05:
                            n += 4;
                            break;
                        case 0x00:
                        case 0x01:
                        case 0x02:
                        case 0x03:
                        case 0x06:
                        case 0x07:
                            break;
                        case 0x08:
                        case 0x09:
                        case 0x0a:
                        case 0x0b:
                        case 0x0d:
                        case 0x0e:
                        case 0x0f:
                            n++;
                            break;
                        case 0x10:
                        case 0x11:
                        case 0x12:
                        case 0x13:
                        case 0x15:
                        case 0x16:
                        case 0x17:
                            n += 4;
                            break;
                        }
                    }
                    if (n > 15) Cc(6);
                };
                n += Dd;
                if (n > 15) Cc(6);
                break Ed;
            case 0xf6:
                {
                    {
                        if ((n + 1) > 15) Cc(6);
                        fa = (Nb + (n++)) >> 0;
                        Ea = (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
                    };
                    if (Da & 0x0080) {
                        switch (Ea >> 6) {
                        case 0:
                            if ((Ea & 7) == 6) n += 2;
                            break;
                        case 1:
                            n++;
                            break;
                        case 2:
                            n += 2;
                            break;
                        case 3:
                        default:
                            break;
                        }
                    } else {
                        switch ((Ea & 7) | ((Ea >> 3) & 0x18)) {
                        case 0x04:
                            {
                                if ((n + 1) > 15) Cc(6);
                                fa = (Nb + (n++)) >> 0;
                                Cd = (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
                            };
                            if ((Cd & 7) == 5) {
                                n += 4;
                            }
                            break;
                        case 0x0c:
                            n += 2;
                            break;
                        case 0x14:
                            n += 5;
                            break;
                        case 0x05:
                            n += 4;
                            break;
                        case 0x00:
                        case 0x01:
                        case 0x02:
                        case 0x03:
                        case 0x06:
                        case 0x07:
                            break;
                        case 0x08:
                        case 0x09:
                        case 0x0a:
                        case 0x0b:
                        case 0x0d:
                        case 0x0e:
                        case 0x0f:
                            n++;
                            break;
                        case 0x10:
                        case 0x11:
                        case 0x12:
                        case 0x13:
                        case 0x15:
                        case 0x16:
                        case 0x17:
                            n += 4;
                            break;
                        }
                    }
                    if (n > 15) Cc(6);
                };
                Ja = (Ea >> 3) & 7;
                if (Ja == 0) {
                    n++;
                    if (n > 15) Cc(6);
                }
                break Ed;
            case 0xf7:
                {
                    {
                        if ((n + 1) > 15) Cc(6);
                        fa = (Nb + (n++)) >> 0;
                        Ea = (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
                    };
                    if (Da & 0x0080) {
                        switch (Ea >> 6) {
                        case 0:
                            if ((Ea & 7) == 6) n += 2;
                            break;
                        case 1:
                            n++;
                            break;
                        case 2:
                            n += 2;
                            break;
                        case 3:
                        default:
                            break;
                        }
                    } else {
                        switch ((Ea & 7) | ((Ea >> 3) & 0x18)) {
                        case 0x04:
                            {
                                if ((n + 1) > 15) Cc(6);
                                fa = (Nb + (n++)) >> 0;
                                Cd = (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
                            };
                            if ((Cd & 7) == 5) {
                                n += 4;
                            }
                            break;
                        case 0x0c:
                            n += 2;
                            break;
                        case 0x14:
                            n += 5;
                            break;
                        case 0x05:
                            n += 4;
                            break;
                        case 0x00:
                        case 0x01:
                        case 0x02:
                        case 0x03:
                        case 0x06:
                        case 0x07:
                            break;
                        case 0x08:
                        case 0x09:
                        case 0x0a:
                        case 0x0b:
                        case 0x0d:
                        case 0x0e:
                        case 0x0f:
                            n++;
                            break;
                        case 0x10:
                        case 0x11:
                        case 0x12:
                        case 0x13:
                        case 0x15:
                        case 0x16:
                        case 0x17:
                            n += 4;
                            break;
                        }
                    }
                    if (n > 15) Cc(6);
                };
                Ja = (Ea >> 3) & 7;
                if (Ja == 0) {
                    n += Dd;
                    if (n > 15) Cc(6);
                }
                break Ed;
            case 0xea:
            case 0x9a:
                n += 2 + Dd;
                if (n > 15) Cc(6);
                break Ed;
            case 0xc2:
            case 0xca:
                n += 2;
                if (n > 15) Cc(6);
                break Ed;
            case 0xc8:
                n += 3;
                if (n > 15) Cc(6);
                break Ed;
            case 0xd6:
            case 0xf1:
            default:
                Cc(6);
            case 0x0f:
                {
                    if ((n + 1) > 15) Cc(6);
                    fa = (Nb + (n++)) >> 0;
                    b = (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
                };
                switch (b) {
                case 0x06:
                case 0xa2:
                case 0x31:
                case 0xa0:
                case 0xa8:
                case 0xa1:
                case 0xa9:
                case 0xc8:
                case 0xc9:
                case 0xca:
                case 0xcb:
                case 0xcc:
                case 0xcd:
                case 0xce:
                case 0xcf:
                    break Ed;
                case 0x80:
                case 0x81:
                case 0x82:
                case 0x83:
                case 0x84:
                case 0x85:
                case 0x86:
                case 0x87:
                case 0x88:
                case 0x89:
                case 0x8a:
                case 0x8b:
                case 0x8c:
                case 0x8d:
                case 0x8e:
                case 0x8f:
                    n += Dd;
                    if (n > 15) Cc(6);
                    break Ed;
                case 0x90:
                case 0x91:
                case 0x92:
                case 0x93:
                case 0x94:
                case 0x95:
                case 0x96:
                case 0x97:
                case 0x98:
                case 0x99:
                case 0x9a:
                case 0x9b:
                case 0x9c:
                case 0x9d:
                case 0x9e:
                case 0x9f:
                case 0x40:
                case 0x41:
                case 0x42:
                case 0x43:
                case 0x44:
                case 0x45:
                case 0x46:
                case 0x47:
                case 0x48:
                case 0x49:
                case 0x4a:
                case 0x4b:
                case 0x4c:
                case 0x4d:
                case 0x4e:
                case 0x4f:
                case 0xb6:
                case 0xb7:
                case 0xbe:
                case 0xbf:
                case 0x00:
                case 0x01:
                case 0x02:
                case 0x03:
                case 0x20:
                case 0x22:
                case 0x23:
                case 0xb2:
                case 0xb4:
                case 0xb5:
                case 0xa5:
                case 0xad:
                case 0xa3:
                case 0xab:
                case 0xb3:
                case 0xbb:
                case 0xbc:
                case 0xbd:
                case 0xaf:
                case 0xc0:
                case 0xc1:
                case 0xb0:
                case 0xb1:
                    {
                        {
                            if ((n + 1) > 15) Cc(6);
                            fa = (Nb + (n++)) >> 0;
                            Ea = (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
                        };
                        if (Da & 0x0080) {
                            switch (Ea >> 6) {
                            case 0:
                                if ((Ea & 7) == 6) n += 2;
                                break;
                            case 1:
                                n++;
                                break;
                            case 2:
                                n += 2;
                                break;
                            case 3:
                            default:
                                break;
                            }
                        } else {
                            switch ((Ea & 7) | ((Ea >> 3) & 0x18)) {
                            case 0x04:
                                {
                                    if ((n + 1) > 15) Cc(6);
                                    fa = (Nb + (n++)) >> 0;
                                    Cd = (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
                                };
                                if ((Cd & 7) == 5) {
                                    n += 4;
                                }
                                break;
                            case 0x0c:
                                n += 2;
                                break;
                            case 0x14:
                                n += 5;
                                break;
                            case 0x05:
                                n += 4;
                                break;
                            case 0x00:
                            case 0x01:
                            case 0x02:
                            case 0x03:
                            case 0x06:
                            case 0x07:
                                break;
                            case 0x08:
                            case 0x09:
                            case 0x0a:
                            case 0x0b:
                            case 0x0d:
                            case 0x0e:
                            case 0x0f:
                                n++;
                                break;
                            case 0x10:
                            case 0x11:
                            case 0x12:
                            case 0x13:
                            case 0x15:
                            case 0x16:
                            case 0x17:
                                n += 4;
                                break;
                            }
                        }
                        if (n > 15) Cc(6);
                    };
                    break Ed;
                case 0xa4:
                case 0xac:
                case 0xba:
                    {
                        {
                            if ((n + 1) > 15) Cc(6);
                            fa = (Nb + (n++)) >> 0;
                            Ea = (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
                        };
                        if (Da & 0x0080) {
                            switch (Ea >> 6) {
                            case 0:
                                if ((Ea & 7) == 6) n += 2;
                                break;
                            case 1:
                                n++;
                                break;
                            case 2:
                                n += 2;
                                break;
                            case 3:
                            default:
                                break;
                            }
                        } else {
                            switch ((Ea & 7) | ((Ea >> 3) & 0x18)) {
                            case 0x04:
                                {
                                    if ((n + 1) > 15) Cc(6);
                                    fa = (Nb + (n++)) >> 0;
                                    Cd = (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
                                };
                                if ((Cd & 7) == 5) {
                                    n += 4;
                                }
                                break;
                            case 0x0c:
                                n += 2;
                                break;
                            case 0x14:
                                n += 5;
                                break;
                            case 0x05:
                                n += 4;
                                break;
                            case 0x00:
                            case 0x01:
                            case 0x02:
                            case 0x03:
                            case 0x06:
                            case 0x07:
                                break;
                            case 0x08:
                            case 0x09:
                            case 0x0a:
                            case 0x0b:
                            case 0x0d:
                            case 0x0e:
                            case 0x0f:
                                n++;
                                break;
                            case 0x10:
                            case 0x11:
                            case 0x12:
                            case 0x13:
                            case 0x15:
                            case 0x16:
                            case 0x17:
                                n += 4;
                                break;
                            }
                        }
                        if (n > 15) Cc(6);
                    };
                    n++;
                    if (n > 15) Cc(6);
                    break Ed;
                case 0x04:
                case 0x05:
                case 0x07:
                case 0x08:
                case 0x09:
                case 0x0a:
                case 0x0b:
                case 0x0c:
                case 0x0d:
                case 0x0e:
                case 0x0f:
                case 0x10:
                case 0x11:
                case 0x12:
                case 0x13:
                case 0x14:
                case 0x15:
                case 0x16:
                case 0x17:
                case 0x18:
                case 0x19:
                case 0x1a:
                case 0x1b:
                case 0x1c:
                case 0x1d:
                case 0x1e:
                case 0x1f:
                case 0x21:
                case 0x24:
                case 0x25:
                case 0x26:
                case 0x27:
                case 0x28:
                case 0x29:
                case 0x2a:
                case 0x2b:
                case 0x2c:
                case 0x2d:
                case 0x2e:
                case 0x2f:
                case 0x30:
                case 0x32:
                case 0x33:
                case 0x34:
                case 0x35:
                case 0x36:
                case 0x37:
                case 0x38:
                case 0x39:
                case 0x3a:
                case 0x3b:
                case 0x3c:
                case 0x3d:
                case 0x3e:
                case 0x3f:
                case 0x50:
                case 0x51:
                case 0x52:
                case 0x53:
                case 0x54:
                case 0x55:
                case 0x56:
                case 0x57:
                case 0x58:
                case 0x59:
                case 0x5a:
                case 0x5b:
                case 0x5c:
                case 0x5d:
                case 0x5e:
                case 0x5f:
                case 0x60:
                case 0x61:
                case 0x62:
                case 0x63:
                case 0x64:
                case 0x65:
                case 0x66:
                case 0x67:
                case 0x68:
                case 0x69:
                case 0x6a:
                case 0x6b:
                case 0x6c:
                case 0x6d:
                case 0x6e:
                case 0x6f:
                case 0x70:
                case 0x71:
                case 0x72:
                case 0x73:
                case 0x74:
                case 0x75:
                case 0x76:
                case 0x77:
                case 0x78:
                case 0x79:
                case 0x7a:
                case 0x7b:
                case 0x7c:
                case 0x7d:
                case 0x7e:
                case 0x7f:
                case 0xa6:
                case 0xa7:
                case 0xaa:
                case 0xae:
                case 0xb8:
                case 0xb9:
                case 0xc2:
                case 0xc3:
                case 0xc4:
                case 0xc5:
                case 0xc6:
                case 0xc7:
                default:
                    Cc(6);
                }
                break;
            }
        }
        return n;
    }
    function fb(Fd, Gd, ja) {
        var Hd, Id, error_code, Jd, Kd, Ld, Md, td, Nd;
        if (! (wa.cr0 & (1 << 31))) {
            wa.tlb_set_page(Fd & -4096, Fd & -4096, 1);
        } else {
            Hd = (wa.cr3 & -4096) + ((Fd >> 20) & 0xffc);
            Id = wa.ld32_phys(Hd);
            if (! (Id & 0x00000001)) {
                error_code = 0;
            } else {
                if (! (Id & 0x00000020)) {
                    Id |= 0x00000020;
                    wa.st32_phys(Hd, Id);
                }
                Jd = (Id & -4096) + ((Fd >> 10) & 0xffc);
                Kd = wa.ld32_phys(Jd);
                if (! (Kd & 0x00000001)) {
                    error_code = 0;
                } else {
                    Ld = Kd & Id;
                    if (ja && !(Ld & 0x00000004)) {
                        error_code = 0x01;
                    } else if (Gd && !(Ld & 0x00000002)) {
                        error_code = 0x01;
                    } else {
                        Md = (Gd && !(Kd & 0x00000040));
                        if (! (Kd & 0x00000020) || Md) {
                            Kd |= 0x00000020;
                            if (Md) Kd |= 0x00000040;
                            wa.st32_phys(Jd, Kd);
                        }
                        td = 0;
                        if ((Kd & 0x00000040) && (Ld & 0x00000002)) td = 1;
                        Nd = 0;
                        if (Ld & 0x00000004) Nd = 1;
                        wa.tlb_set_page(Fd & -4096, Kd & -4096, td, Nd);
                        return;
                    }
                }
            }
            error_code |= Gd << 1;
            error_code |= ja << 2;
            wa.cr2 = Fd;
            pd(14, error_code);
        }
    }
    function Od(Pd) {
        if (! (Pd & (1 << 0))) md("real mode not supported");
        if ((Pd & ((1 << 31) | (1 << 16) | (1 << 0))) != (wa.cr0 & ((1 << 31) | (1 << 16) | (1 << 0)))) {
            wa.tlb_flush_all();
        }
        wa.cr0 = Pd | (1 << 4);
    }
    function Qd(Rd) {
        wa.cr3 = Rd;
        if (wa.cr0 & (1 << 31)) {
            wa.tlb_flush_all();
        }
    }
    function Sd(Td) {
        wa.cr4 = Td;
    }
    function Ud(Vd) {
        if (Vd & (1 << 22)) return - 1;
        else return 0xffff;
    }
    function Wd(selector) {
        var sa, Rb, Xd, Vd;
        if (selector & 0x4) sa = wa.ldt;
        else sa = wa.gdt;
        Rb = selector & ~7;
        if ((Rb + 7) > sa.limit) return null;
        fa = sa.base + Rb;
        Xd = Cb();
        fa += 4;
        Vd = Cb();
        return [Xd, Vd];
    }
    function Yd(Xd, Vd) {
        var limit;
        limit = (Xd & 0xffff) | (Vd & 0x000f0000);
        if (Vd & (1 << 23)) limit = (limit << 12) | 0xfff;
        return limit;
    }
    function Zd(Xd, Vd) {
        return (((Xd >>> 16) | ((Vd & 0xff) << 16) | (Vd & 0xff000000))) & -1;
    }
    function ae(sa, Xd, Vd) {
        sa.base = Zd(Xd, Vd);
        sa.limit = Yd(Xd, Vd);
        sa.flags = Vd;
    }
    function be() {
        Na = wa.segs[1].base;
        Oa = wa.segs[2].base;
        if (wa.segs[2].flags & (1 << 22)) Pa = -1;
        else Pa = 0xffff;
        Qa = (((Na | Oa | wa.segs[3].base | wa.segs[0].base) == 0) && Pa == -1);
        if (wa.segs[1].flags & (1 << 22)) Ra = 0;
        else Ra = 0x0100 | 0x0080;
    }
    function ce(de, selector, base, limit, flags) {
        wa.segs[de] = {
            selector: selector,
            base: base,
            limit: limit,
            flags: flags
        };
        be();
    }
    function ee(Sb, selector) {
        ce(Sb, selector, (selector << 4), 0xffff, (1 << 15) | (3 << 13) | (1 << 12) | (1 << 8) | (1 << 12) | (1 << 9));
    }
    function fe(ge) {
        var he, Rb, ie, je, ke;
        if (! (wa.tr.flags & (1 << 15))) md("invalid tss");
        he = (wa.tr.flags >> 8) & 0xf;
        if ((he & 7) != 1) md("invalid tss type");
        ie = he >> 3;
        Rb = (ge * 4 + 2) << ie;
        if (Rb + (4 << ie) - 1 > wa.tr.limit) pd(10, wa.tr.selector & 0xfffc);
        fa = (wa.tr.base + Rb) & -1;
        if (ie == 0) {
            ke = Ab();
            fa += 2;
        } else {
            ke = Cb();
            fa += 4;
        }
        je = Ab();
        return [je, ke];
    }
    function le(intno, me, error_code, ne, oe) {
        var sa, pe, he, ge, selector, qe, re;
        var se, te, ie;
        var e, Xd, Vd, ue, je, ke, ve, we;
        var xe, Pa;
        se = 0;
        if (!me && !oe) {
            switch (intno) {
            case 8:
            case 10:
            case 11:
            case 12:
            case 13:
            case 14:
            case 17:
                se = 1;
                break;
            }
        }
        if (me) xe = ne;
        else xe = Jb;
        sa = wa.idt;
        if (intno * 8 + 7 > sa.limit) pd(13, intno * 8 + 2);
        fa = (sa.base + intno * 8) & -1;
        Xd = Cb();
        fa += 4;
        Vd = Cb();
        he = (Vd >> 8) & 0x1f;
        switch (he) {
        case 5:
        case 7:
        case 6:
            throw "unsupported task gate";
        case 14:
        case 15:
            break;
        default:
            pd(13, intno * 8 + 2);
            break;
        }
        ge = (Vd >> 13) & 3;
        re = wa.cpl;
        if (me && ge < re) pd(13, intno * 8 + 2);
        if (! (Vd & (1 << 15))) pd(11, intno * 8 + 2);
        selector = Xd >> 16;
        ue = (Vd & -65536) | (Xd & 0x0000ffff);
        if ((selector & 0xfffc) == 0) pd(13, 0);
        e = Wd(selector);
        if (!e) pd(13, selector & 0xfffc);
        Xd = e[0];
        Vd = e[1];
        if (! (Vd & (1 << 12)) || !(Vd & ((1 << 11)))) pd(13, selector & 0xfffc);
        ge = (Vd >> 13) & 3;
        if (ge > re) pd(13, selector & 0xfffc);
        if (! (Vd & (1 << 15))) pd(11, selector & 0xfffc);
        if (! (Vd & (1 << 10)) && ge < re) {
            e = fe(ge);
            je = e[0];
            ke = e[1];
            if ((je & 0xfffc) == 0) pd(10, je & 0xfffc);
            if ((je & 3) != ge) pd(10, je & 0xfffc);
            e = Wd(je);
            if (!e) pd(10, je & 0xfffc);
            ve = e[0];
            we = e[1];
            qe = (we >> 13) & 3;
            if (qe != ge) pd(10, je & 0xfffc);
            if (! (we & (1 << 12)) || (we & (1 << 11)) || !(we & (1 << 9))) pd(10, je & 0xfffc);
            if (! (we & (1 << 15))) pd(10, je & 0xfffc);
            te = 1;
            Pa = Ud(we);
            pe = Zd(ve, we);
        } else if ((Vd & (1 << 10)) || ge == re) {
            if (wa.eflags & 0x00020000) pd(13, selector & 0xfffc);
            te = 0;
            Pa = Ud(wa.segs[2].flags);
            pe = wa.segs[2].base;
            ke = xa[4];
            ge = re;
        } else {
            pd(13, selector & 0xfffc);
            te = 0;
            Pa = 0;
            pe = 0;
            ke = 0;
        }
        ie = he >> 3;
        if (ie == 1) {
            if (te) {
                if (wa.eflags & 0x00020000) {
                    {
                        ke = (ke - 4) & -1;
                        fa = (pe + (ke & Pa)) & -1;
                        Ib(wa.segs[5].selector);
                    }; {
                        ke = (ke - 4) & -1;
                        fa = (pe + (ke & Pa)) & -1;
                        Ib(wa.segs[4].selector);
                    }; {
                        ke = (ke - 4) & -1;
                        fa = (pe + (ke & Pa)) & -1;
                        Ib(wa.segs[3].selector);
                    }; {
                        ke = (ke - 4) & -1;
                        fa = (pe + (ke & Pa)) & -1;
                        Ib(wa.segs[0].selector);
                    };
                } {
                    ke = (ke - 4) & -1;
                    fa = (pe + (ke & Pa)) & -1;
                    Ib(wa.segs[2].selector);
                }; {
                    ke = (ke - 4) & -1;
                    fa = (pe + (ke & Pa)) & -1;
                    Ib(xa[4]);
                };
            } {
                ke = (ke - 4) & -1;
                fa = (pe + (ke & Pa)) & -1;
                Ib(hd());
            }; {
                ke = (ke - 4) & -1;
                fa = (pe + (ke & Pa)) & -1;
                Ib(wa.segs[1].selector);
            }; {
                ke = (ke - 4) & -1;
                fa = (pe + (ke & Pa)) & -1;
                Ib(xe);
            };
            if (se) {
                {
                    ke = (ke - 4) & -1;
                    fa = (pe + (ke & Pa)) & -1;
                    Ib(error_code);
                };
            }
        } else {
            if (te) {
                if (wa.eflags & 0x00020000) {
                    {
                        ke = (ke - 2) & -1;
                        fa = (pe + (ke & Pa)) & -1;
                        Gb(wa.segs[5].selector);
                    }; {
                        ke = (ke - 2) & -1;
                        fa = (pe + (ke & Pa)) & -1;
                        Gb(wa.segs[4].selector);
                    }; {
                        ke = (ke - 2) & -1;
                        fa = (pe + (ke & Pa)) & -1;
                        Gb(wa.segs[3].selector);
                    }; {
                        ke = (ke - 2) & -1;
                        fa = (pe + (ke & Pa)) & -1;
                        Gb(wa.segs[0].selector);
                    };
                } {
                    ke = (ke - 2) & -1;
                    fa = (pe + (ke & Pa)) & -1;
                    Gb(wa.segs[2].selector);
                }; {
                    ke = (ke - 2) & -1;
                    fa = (pe + (ke & Pa)) & -1;
                    Gb(xa[4]);
                };
            } {
                ke = (ke - 2) & -1;
                fa = (pe + (ke & Pa)) & -1;
                Gb(hd());
            }; {
                ke = (ke - 2) & -1;
                fa = (pe + (ke & Pa)) & -1;
                Gb(wa.segs[1].selector);
            }; {
                ke = (ke - 2) & -1;
                fa = (pe + (ke & Pa)) & -1;
                Gb(xe);
            };
            if (se) {
                {
                    ke = (ke - 2) & -1;
                    fa = (pe + (ke & Pa)) & -1;
                    Gb(error_code);
                };
            }
        }
        if (te) {
            if (wa.eflags & 0x00020000) {
                ce(0, 0, 0, 0, 0);
                ce(3, 0, 0, 0, 0);
                ce(4, 0, 0, 0, 0);
                ce(5, 0, 0, 0, 0);
            }
            je = (je & ~3) | ge;
            ce(2, je, pe, Yd(ve, we), we);
        }
        xa[4] = (xa[4] & ~Pa) | ((ke) & Pa);
        selector = (selector & ~3) | ge;
        ce(1, selector, Zd(Xd, Vd), Yd(Xd, Vd), Vd);
        qd(ge);
        Jb = ue,
        Kb = Mb = 0;
        if ((he & 1) == 0) {
            wa.eflags &= ~0x00000200;
        }
        wa.eflags &= ~ (0x00000100 | 0x00020000 | 0x00010000 | 0x00004000);
    }
    function ye(intno, me, error_code, ne, oe) {
        var sa, pe, selector, ue, ke, xe;
        sa = wa.idt;
        if (intno * 4 + 3 > sa.limit) pd(13, intno * 8 + 2);
        fa = (sa.base + (intno << 2)) >> 0;
        ue = Ab();
        fa = (fa + 2) >> 0;
        selector = Ab();
        ke = xa[4];
        if (me) xe = ne;
        else xe = Jb; {
            ke = (ke - 2) >> 0;
            fa = ((ke & Pa) + Oa) >> 0;
            ub(hd());
        }; {
            ke = (ke - 2) >> 0;
            fa = ((ke & Pa) + Oa) >> 0;
            ub(wa.segs[1].selector);
        }; {
            ke = (ke - 2) >> 0;
            fa = ((ke & Pa) + Oa) >> 0;
            ub(xe);
        };
        xa[4] = (xa[4] & ~Pa) | ((ke) & Pa);
        Jb = ue,
        Kb = Mb = 0;
        wa.segs[1].selector = selector;
        wa.segs[1].base = (selector << 4);
        wa.eflags &= ~ (0x00000200 | 0x00000100 | 0x00040000 | 0x00010000);
    }
    function ze(intno, me, error_code, ne, oe) {
        if (wa.cr0 & (1 << 0)) {
            le(intno, me, error_code, ne, oe);
        } else {
            ye(intno, me, error_code, ne, oe);
        }
    }
    function Ae(selector) {
        var sa, Xd, Vd, Rb, Be;
        selector &= 0xffff;
        if ((selector & 0xfffc) == 0) {
            wa.ldt.base = 0;
            wa.ldt.limit = 0;
        } else {
            if (selector & 0x4) pd(13, selector & 0xfffc);
            sa = wa.gdt;
            Rb = selector & ~7;
            Be = 7;
            if ((Rb + Be) > sa.limit) pd(13, selector & 0xfffc);
            fa = (sa.base + Rb) & -1;
            Xd = Cb();
            fa += 4;
            Vd = Cb();
            if ((Vd & (1 << 12)) || ((Vd >> 8) & 0xf) != 2) pd(13, selector & 0xfffc);
            if (! (Vd & (1 << 15))) pd(11, selector & 0xfffc);
            ae(wa.ldt, Xd, Vd);
        }
        wa.ldt.selector = selector;
    }
    function Ce(selector) {
        var sa, Xd, Vd, Rb, he, Be;
        selector &= 0xffff;
        if ((selector & 0xfffc) == 0) {
            wa.tr.base = 0;
            wa.tr.limit = 0;
            wa.tr.flags = 0;
        } else {
            if (selector & 0x4) pd(13, selector & 0xfffc);
            sa = wa.gdt;
            Rb = selector & ~7;
            Be = 7;
            if ((Rb + Be) > sa.limit) pd(13, selector & 0xfffc);
            fa = (sa.base + Rb) & -1;
            Xd = Cb();
            fa += 4;
            Vd = Cb();
            he = (Vd >> 8) & 0xf;
            if ((Vd & (1 << 12)) || (he != 1 && he != 9)) pd(13, selector & 0xfffc);
            if (! (Vd & (1 << 15))) pd(11, selector & 0xfffc);
            ae(wa.tr, Xd, Vd);
            Vd |= (1 << 9);
            Ib(Vd);
        }
        wa.tr.selector = selector;
    }
    function De(Ee, selector) {
        var Xd, Vd, re, ge, Fe, sa, Rb;
        re = wa.cpl;
        if ((selector & 0xfffc) == 0) {
            if (Ee == 2) pd(13, 0);
            ce(Ee, selector, 0, 0, 0);
        } else {
            if (selector & 0x4) sa = wa.ldt;
            else sa = wa.gdt;
            Rb = selector & ~7;
            if ((Rb + 7) > sa.limit) pd(13, selector & 0xfffc);
            fa = (sa.base + Rb) & -1;
            Xd = Cb();
            fa += 4;
            Vd = Cb();
            if (! (Vd & (1 << 12))) pd(13, selector & 0xfffc);
            Fe = selector & 3;
            ge = (Vd >> 13) & 3;
            if (Ee == 2) {
                if ((Vd & (1 << 11)) || !(Vd & (1 << 9))) pd(13, selector & 0xfffc);
                if (Fe != re || ge != re) pd(13, selector & 0xfffc);
            } else {
                if ((Vd & ((1 << 11) | (1 << 9))) == (1 << 11)) pd(13, selector & 0xfffc);
                if (! (Vd & (1 << 11)) || !(Vd & (1 << 10))) {
                    if (ge < re || ge < Fe) pd(13, selector & 0xfffc);
                }
            }
            if (! (Vd & (1 << 15))) {
                if (Ee == 2) pd(12, selector & 0xfffc);
                else pd(11, selector & 0xfffc);
            }
            if (! (Vd & (1 << 8))) {
                Vd |= (1 << 8);
                Ib(Vd);
            }
            ce(Ee, selector, Zd(Xd, Vd), Yd(Xd, Vd), Vd);
        }
    }
    function Ge(Ee, selector) {
        var sa;
        selector &= 0xffff;
        if (! (wa.cr0 & (1 << 0))) {
            sa = wa.segs[Ee];
            sa.selector = selector;
            sa.base = selector << 4;
        } else if (wa.eflags & 0x00020000) {
            ee(Ee, selector);
        } else {
            De(Ee, selector);
        }
    }
    function He(Ie, Je) {
        Jb = Je,
        Kb = Mb = 0;
        wa.segs[1].selector = Ie;
        wa.segs[1].base = (Ie << 4);
        be();
    }
    function Ke(Ie, Je) {
        var Le, he, Xd, Vd, re, ge, Fe, limit, e;
        if ((Ie & 0xfffc) == 0) pd(13, 0);
        e = Wd(Ie);
        if (!e) pd(13, Ie & 0xfffc);
        Xd = e[0];
        Vd = e[1];
        re = wa.cpl;
        if (Vd & (1 << 12)) {
            if (! (Vd & (1 << 11))) pd(13, Ie & 0xfffc);
            ge = (Vd >> 13) & 3;
            if (Vd & (1 << 10)) {
                if (ge > re) pd(13, Ie & 0xfffc);
            } else {
                Fe = Ie & 3;
                if (Fe > re) pd(13, Ie & 0xfffc);
                if (ge != re) pd(13, Ie & 0xfffc);
            }
            if (! (Vd & (1 << 15))) pd(11, Ie & 0xfffc);
            limit = Yd(Xd, Vd);
            if ((Je >>> 0) > (limit >>> 0)) pd(13, Ie & 0xfffc);
            ce(1, (Ie & 0xfffc) | re, Zd(Xd, Vd), limit, Vd);
            Jb = Je,
            Kb = Mb = 0;
        } else {
            md("unsupported jump to call or task gate");
        }
    }
    function Me(Ie, Je) {
        if (! (wa.cr0 & (1 << 0)) || (wa.eflags & 0x00020000)) {
            He(Ie, Je);
        } else {
            Ke(Ie, Je);
        }
    }
    function Ne(Ee, re) {
        var ge, Vd;
        if ((Ee == 4 || Ee == 5) && (wa.segs[Ee].selector & 0xfffc) == 0) return;
        Vd = wa.segs[Ee].flags;
        ge = (Vd >> 13) & 3;
        if (! (Vd & (1 << 11)) || !(Vd & (1 << 10))) {
            if (ge < re) {
                ce(Ee, 0, 0, 0, 0);
            }
        }
    }
    function Oe(ie, Ie, Je, ne) {
        var ke;
        ke = xa[4];
        if (ie) {
            {
                ke = (ke - 4) >> 0;
                fa = ((ke & Pa) + Oa) >> 0;
                wb(wa.segs[1].selector);
            }; {
                ke = (ke - 4) >> 0;
                fa = ((ke & Pa) + Oa) >> 0;
                wb(ne);
            };
        } else {
            {
                ke = (ke - 2) >> 0;
                fa = ((ke & Pa) + Oa) >> 0;
                ub(wa.segs[1].selector);
            }; {
                ke = (ke - 2) >> 0;
                fa = ((ke & Pa) + Oa) >> 0;
                ub(ne);
            };
        }
        xa[4] = (xa[4] & ~Pa) | ((ke) & Pa);
        Jb = Je,
        Kb = Mb = 0;
        wa.segs[1].selector = Ie;
        wa.segs[1].base = (Ie << 4);
        be();
    }
    function Pe(ie, Ie, Je, ne) {
        var te, i, e;
        var Xd, Vd, re, ge, Fe, selector, ue, Qe;
        var je, ve, we, Re, he, qe, Pa;
        var ga, limit, Se;
        var pe, Te, Ue;
        if ((Ie & 0xfffc) == 0) pd(13, 0);
        e = Wd(Ie);
        if (!e) pd(13, Ie & 0xfffc);
        Xd = e[0];
        Vd = e[1];
        re = wa.cpl;
        Ue = xa[4];
        if (Vd & (1 << 12)) {
            if (! (Vd & (1 << 11))) pd(13, Ie & 0xfffc);
            ge = (Vd >> 13) & 3;
            if (Vd & (1 << 10)) {
                if (ge > re) pd(13, Ie & 0xfffc);
            } else {
                Fe = Ie & 3;
                if (Fe > re) pd(13, Ie & 0xfffc);
                if (ge != re) pd(13, Ie & 0xfffc);
            }
            if (! (Vd & (1 << 15))) pd(11, Ie & 0xfffc); {
                Re = Ue;
                Pa = Ud(wa.segs[2].flags);
                pe = wa.segs[2].base;
                if (ie) {
                    {
                        Re = (Re - 4) & -1;
                        fa = (pe + (Re & Pa)) & -1;
                        Ib(wa.segs[1].selector);
                    }; {
                        Re = (Re - 4) & -1;
                        fa = (pe + (Re & Pa)) & -1;
                        Ib(ne);
                    };
                } else {
                    {
                        Re = (Re - 2) & -1;
                        fa = (pe + (Re & Pa)) & -1;
                        Gb(wa.segs[1].selector);
                    }; {
                        Re = (Re - 2) & -1;
                        fa = (pe + (Re & Pa)) & -1;
                        Gb(ne);
                    };
                }
                limit = Yd(Xd, Vd);
                if (Je > limit) pd(13, Ie & 0xfffc);
                xa[4] = (xa[4] & ~Pa) | ((Re) & Pa);
                ce(1, (Ie & 0xfffc) | re, Zd(Xd, Vd), limit, Vd);
                Jb = Je,
                Kb = Mb = 0;
            }
        } else {
            he = (Vd >> 8) & 0x1f;
            ge = (Vd >> 13) & 3;
            Fe = Ie & 3;
            switch (he) {
            case 1:
            case 9:
            case 5:
                throw "unsupported task gate";
                return;
            case 4:
            case 12:
                break;
            default:
                pd(13, Ie & 0xfffc);
                break;
            }
            ie = he >> 3;
            if (ge < re || ge < Fe) pd(13, Ie & 0xfffc);
            if (! (Vd & (1 << 15))) pd(11, Ie & 0xfffc);
            selector = Xd >> 16;
            ue = (Vd & 0xffff0000) | (Xd & 0x0000ffff);
            Qe = Vd & 0x1f;
            if ((selector & 0xfffc) == 0) pd(13, 0);
            e = Wd(selector);
            if (!e) pd(13, selector & 0xfffc);
            Xd = e[0];
            Vd = e[1];
            if (! (Vd & (1 << 12)) || !(Vd & ((1 << 11)))) pd(13, selector & 0xfffc);
            ge = (Vd >> 13) & 3;
            if (ge > re) pd(13, selector & 0xfffc);
            if (! (Vd & (1 << 15))) pd(11, selector & 0xfffc);
            if (! (Vd & (1 << 10)) && ge < re) {
                e = fe(ge);
                je = e[0];
                Re = e[1];
                if ((je & 0xfffc) == 0) pd(10, je & 0xfffc);
                if ((je & 3) != ge) pd(10, je & 0xfffc);
                e = Wd(je);
                if (!e) pd(10, je & 0xfffc);
                ve = e[0];
                we = e[1];
                qe = (we >> 13) & 3;
                if (qe != ge) pd(10, je & 0xfffc);
                if (! (we & (1 << 12)) || (we & (1 << 11)) || !(we & (1 << 9))) pd(10, je & 0xfffc);
                if (! (we & (1 << 15))) pd(10, je & 0xfffc);
                Se = Ud(wa.segs[2].flags);
                Te = wa.segs[2].base;
                Pa = Ud(we);
                pe = Zd(ve, we);
                if (ie) {
                    {
                        Re = (Re - 4) & -1;
                        fa = (pe + (Re & Pa)) & -1;
                        Ib(wa.segs[2].selector);
                    }; {
                        Re = (Re - 4) & -1;
                        fa = (pe + (Re & Pa)) & -1;
                        Ib(Ue);
                    };
                    for (i = Qe - 1; i >= 0; i--) {
                        ga = Cb(Te + ((Ue + i * 4) & Se)); {
                            Re = (Re - 4) & -1;
                            fa = (pe + (Re & Pa)) & -1;
                            Ib(ga);
                        };
                    }
                } else {
                    {
                        Re = (Re - 2) & -1;
                        fa = (pe + (Re & Pa)) & -1;
                        Gb(wa.segs[2].selector);
                    }; {
                        Re = (Re - 2) & -1;
                        fa = (pe + (Re & Pa)) & -1;
                        Gb(Ue);
                    };
                    for (i = Qe - 1; i >= 0; i--) {
                        ga = Ab(Te + ((Ue + i * 2) & Se)); {
                            Re = (Re - 2) & -1;
                            fa = (pe + (Re & Pa)) & -1;
                            Gb(ga);
                        };
                    }
                }
                te = 1;
            } else {
                Re = Ue;
                Pa = Ud(wa.segs[2].flags);
                pe = wa.segs[2].base;
                te = 0;
            }
            if (ie) {
                {
                    Re = (Re - 4) & -1;
                    fa = (pe + (Re & Pa)) & -1;
                    Ib(wa.segs[1].selector);
                }; {
                    Re = (Re - 4) & -1;
                    fa = (pe + (Re & Pa)) & -1;
                    Ib(ne);
                };
            } else {
                {
                    Re = (Re - 2) & -1;
                    fa = (pe + (Re & Pa)) & -1;
                    Gb(wa.segs[1].selector);
                }; {
                    Re = (Re - 2) & -1;
                    fa = (pe + (Re & Pa)) & -1;
                    Gb(ne);
                };
            }
            if (te) {
                je = (je & ~3) | ge;
                ce(2, je, pe, Yd(ve, we), we);
            }
            selector = (selector & ~3) | ge;
            ce(1, selector, Zd(Xd, Vd), Yd(Xd, Vd), Vd);
            qd(ge);
            xa[4] = (xa[4] & ~Pa) | ((Re) & Pa);
            Jb = ue,
            Kb = Mb = 0;
        }
    }
    function Ve(ie, Ie, Je, ne) {
        if (! (wa.cr0 & (1 << 0)) || (wa.eflags & 0x00020000)) {
            Oe(ie, Ie, Je, ne);
        } else {
            Pe(ie, Ie, Je, ne);
        }
    }
    function We(ie, Xe, Ye) {
        var Re, Ie, Je, Ze, Pa, pe, af;
        Pa = 0xffff;
        Re = xa[4];
        pe = wa.segs[2].base;
        if (ie == 1) {
            {
                fa = (pe + (Re & Pa)) & -1;
                Je = Cb();
                Re = (Re + 4) & -1;
            }; {
                fa = (pe + (Re & Pa)) & -1;
                Ie = Cb();
                Re = (Re + 4) & -1;
            };
            Ie &= 0xffff;
            if (Xe) {
                fa = (pe + (Re & Pa)) & -1;
                Ze = Cb();
                Re = (Re + 4) & -1;
            };
        } else {
            {
                fa = (pe + (Re & Pa)) & -1;
                Je = Ab();
                Re = (Re + 2) & -1;
            }; {
                fa = (pe + (Re & Pa)) & -1;
                Ie = Ab();
                Re = (Re + 2) & -1;
            };
            if (Xe) {
                fa = (pe + (Re & Pa)) & -1;
                Ze = Ab();
                Re = (Re + 2) & -1;
            };
        }
        xa[4] = (xa[4] & ~Pa) | ((Re + Ye) & Pa);
        wa.segs[1].selector = Ie;
        wa.segs[1].base = (Ie << 4);
        Jb = Je,
        Kb = Mb = 0;
        if (Xe) {
            if (wa.eflags & 0x00020000) af = 0x00000100 | 0x00040000 | 0x00200000 | 0x00000200 | 0x00010000 | 0x00004000;
            else af = 0x00000100 | 0x00040000 | 0x00200000 | 0x00000200 | 0x00003000 | 0x00010000 | 0x00004000;
            if (ie == 0) af &= 0xffff;
            jd(Ze, af);
        }
        be();
    }
    function bf(ie, Xe, Ye) {
        var Ie, Ze, cf;
        var df, ef, ff, gf;
        var e, Xd, Vd, ve, we;
        var re, ge, Fe, af, Sa;
        var pe, Re, Je, vd, Pa;
        Pa = Ud(wa.segs[2].flags);
        Re = xa[4];
        pe = wa.segs[2].base;
        Ze = 0;
        if (ie == 1) {
            {
                fa = (pe + (Re & Pa)) & -1;
                Je = Cb();
                Re = (Re + 4) & -1;
            }; {
                fa = (pe + (Re & Pa)) & -1;
                Ie = Cb();
                Re = (Re + 4) & -1;
            };
            Ie &= 0xffff;
            if (Xe) {
                {
                    fa = (pe + (Re & Pa)) & -1;
                    Ze = Cb();
                    Re = (Re + 4) & -1;
                };
                if (Ze & 0x00020000) {
                    {
                        fa = (pe + (Re & Pa)) & -1;
                        vd = Cb();
                        Re = (Re + 4) & -1;
                    }; {
                        fa = (pe + (Re & Pa)) & -1;
                        cf = Cb();
                        Re = (Re + 4) & -1;
                    }; {
                        fa = (pe + (Re & Pa)) & -1;
                        df = Cb();
                        Re = (Re + 4) & -1;
                    }; {
                        fa = (pe + (Re & Pa)) & -1;
                        ef = Cb();
                        Re = (Re + 4) & -1;
                    }; {
                        fa = (pe + (Re & Pa)) & -1;
                        ff = Cb();
                        Re = (Re + 4) & -1;
                    }; {
                        fa = (pe + (Re & Pa)) & -1;
                        gf = Cb();
                        Re = (Re + 4) & -1;
                    };
                    jd(Ze, 0x00000100 | 0x00040000 | 0x00200000 | 0x00000200 | 0x00003000 | 0x00020000 | 0x00004000 | 0x00080000 | 0x00100000);
                    ee(1, Ie & 0xffff);
                    qd(3);
                    ee(2, cf & 0xffff);
                    ee(0, df & 0xffff);
                    ee(3, ef & 0xffff);
                    ee(4, ff & 0xffff);
                    ee(5, gf & 0xffff);
                    Jb = Je & 0xffff,
                    Kb = Mb = 0;
                    xa[4] = (xa[4] & ~Pa) | ((vd) & Pa);
                    return;
                }
            }
        } else {
            {
                fa = (pe + (Re & Pa)) & -1;
                Je = Ab();
                Re = (Re + 2) & -1;
            }; {
                fa = (pe + (Re & Pa)) & -1;
                Ie = Ab();
                Re = (Re + 2) & -1;
            };
            if (Xe) {
                fa = (pe + (Re & Pa)) & -1;
                Ze = Ab();
                Re = (Re + 2) & -1;
            };
        }
        if ((Ie & 0xfffc) == 0) pd(13, Ie & 0xfffc);
        e = Wd(Ie);
        if (!e) pd(13, Ie & 0xfffc);
        Xd = e[0];
        Vd = e[1];
        if (! (Vd & (1 << 12)) || !(Vd & (1 << 11))) pd(13, Ie & 0xfffc);
        re = wa.cpl;
        Fe = Ie & 3;
        if (Fe < re) pd(13, Ie & 0xfffc);
        ge = (Vd >> 13) & 3;
        if (Vd & (1 << 10)) {
            if (ge > Fe) pd(13, Ie & 0xfffc);
        } else {
            if (ge != Fe) pd(13, Ie & 0xfffc);
        }
        if (! (Vd & (1 << 15))) pd(11, Ie & 0xfffc);
        Re = (Re + Ye) & -1;
        if (Fe == re) {
            ce(1, Ie, Zd(Xd, Vd), Yd(Xd, Vd), Vd);
        } else {
            if (ie == 1) {
                {
                    fa = (pe + (Re & Pa)) & -1;
                    vd = Cb();
                    Re = (Re + 4) & -1;
                }; {
                    fa = (pe + (Re & Pa)) & -1;
                    cf = Cb();
                    Re = (Re + 4) & -1;
                };
                cf &= 0xffff;
            } else {
                {
                    fa = (pe + (Re & Pa)) & -1;
                    vd = Ab();
                    Re = (Re + 2) & -1;
                }; {
                    fa = (pe + (Re & Pa)) & -1;
                    cf = Ab();
                    Re = (Re + 2) & -1;
                };
            }
            if ((cf & 0xfffc) == 0) {
                pd(13, 0);
            } else {
                if ((cf & 3) != Fe) pd(13, cf & 0xfffc);
                e = Wd(cf);
                if (!e) pd(13, cf & 0xfffc);
                ve = e[0];
                we = e[1];
                if (! (we & (1 << 12)) || (we & (1 << 11)) || !(we & (1 << 9))) pd(13, cf & 0xfffc);
                ge = (we >> 13) & 3;
                if (ge != Fe) pd(13, cf & 0xfffc);
                if (! (we & (1 << 15))) pd(11, cf & 0xfffc);
                ce(2, cf, Zd(ve, we), Yd(ve, we), we);
            }
            ce(1, Ie, Zd(Xd, Vd), Yd(Xd, Vd), Vd);
            qd(Fe);
            Re = vd;
            Pa = Ud(we);
            Ne(0, Fe);
            Ne(3, Fe);
            Ne(4, Fe);
            Ne(5, Fe);
            Re = (Re + Ye) & -1;
        }
        xa[4] = (xa[4] & ~Pa) | ((Re) & Pa);
        Jb = Je,
        Kb = Mb = 0;
        if (Xe) {
            af = 0x00000100 | 0x00040000 | 0x00200000 | 0x00010000 | 0x00004000;
            if (re == 0) af |= 0x00003000;
            Sa = (wa.eflags >> 12) & 3;
            if (re <= Sa) af |= 0x00000200;
            if (ie == 0) af &= 0xffff;
            jd(Ze, af);
        }
    }
    function hf(ie) {
        var Sa;
        if (! (wa.cr0 & (1 << 0)) || (wa.eflags & 0x00020000)) {
            if (wa.eflags & 0x00020000) {
                Sa = (wa.eflags >> 12) & 3;
                if (Sa != 3) Cc(13);
            }
            We(ie, 1, 0);
        } else {
            if (wa.eflags & 0x00004000) {
                throw "unsupported task gate";
            } else {
                bf(ie, 1, 0);
            }
        }
    }
    function jf(ie, Ye) {
        if (! (wa.cr0 & (1 << 0)) || (wa.eflags & 0x00020000)) {
            We(ie, 0, Ye);
        } else {
            bf(ie, 0, Ye);
        }
    }
    function kf(selector, lf) {
        var e, Xd, Vd, Fe, ge, re, he;
        if ((selector & 0xfffc) == 0) return null;
        e = Wd(selector);
        if (!e) return null;
        Xd = e[0];
        Vd = e[1];
        Fe = selector & 3;
        ge = (Vd >> 13) & 3;
        re = wa.cpl;
        if (Vd & (1 << 12)) {
            if ((Vd & (1 << 11)) && (Vd & (1 << 10))) {} else {
                if (ge < re || ge < Fe) return null;
            }
        } else {
            he = (Vd >> 8) & 0xf;
            switch (he) {
            case 1:
            case 2:
            case 3:
            case 9:
            case 11:
                break;
            case 4:
            case 5:
            case 12:
                if (lf) return null;
                break;
            default:
                return null;
            }
            if (ge < re || ge < Fe) return null;
        }
        if (lf) {
            return Yd(Xd, Vd);
        } else {
            return Vd & 0x00f0ff00;
        }
    }
    function mf(ie, lf) {
        var ga, Ea, Ga, selector;
        if (! (wa.cr0 & (1 << 0)) || (wa.eflags & 0x00020000)) Cc(6);
        Ea = Ta[Kb++];;
        Ga = (Ea >> 3) & 7;
        if ((Ea >> 6) == 3) {
            selector = xa[Ea & 7] & 0xffff;
        } else {
            fa = Pb(Ea);
            selector = ib();
        }
        ga = kf(selector, lf);
        ya = gd();
        if (ga === null) {
            ya &= ~0x0040;
        } else {
            ya |= 0x0040;
            if (ie) xa[Ga] = ga;
            else Wb(Ga, ga);
        }
        za = ((ya >> 6) & 1) ^ 1;
        Aa = 24;
    }
    function nf(selector, td) {
        var e, Xd, Vd, Fe, ge, re;
        if ((selector & 0xfffc) == 0) return 0;
        e = Wd(selector);
        if (!e) return 0;
        Xd = e[0];
        Vd = e[1];
        if (! (Vd & (1 << 12))) return 0;
        Fe = selector & 3;
        ge = (Vd >> 13) & 3;
        re = wa.cpl;
        if (Vd & (1 << 11)) {
            if (td) {
                return 0;
            } else {
                if (! (Vd & (1 << 9))) return 1;
                if (! (Vd & (1 << 10))) {
                    if (ge < re || ge < Fe) return 0;
                }
            }
        } else {
            if (ge < re || ge < Fe) return 0;
            if (td && !(Vd & (1 << 9))) return 0;
        }
        return 1;
    }
    function of(selector, td) {
        var z;
        z = nf(selector, td);
        ya = gd();
        if (z) ya |= 0x0040;
        else ya &= ~0x0040;
        za = ((ya >> 6) & 1) ^ 1;
        Aa = 24;
    }
    function pf() {
        var Ea, ga, Ha, Fa;
        if (! (wa.cr0 & (1 << 0)) || (wa.eflags & 0x00020000)) Cc(6);
        Ea = Ta[Kb++];;
        if ((Ea >> 6) == 3) {
            Fa = Ea & 7;
            ga = xa[Fa] & 0xffff;
        } else {
            fa = Pb(Ea);
            ga = ob();
        }
        Ha = xa[(Ea >> 3) & 7];
        ya = gd();
        if ((ga & 3) < (Ha & 3)) {
            ga = (ga & ~3) | (Ha & 3);
            if ((Ea >> 6) == 3) {
                Wb(Fa, ga);
            } else {
                ub(ga);
            }
            ya |= 0x0040;
        } else {
            ya &= ~0x0040;
        }
        za = ((ya >> 6) & 1) ^ 1;
        Aa = 24;
    }
    function qf() {
        var Rb;
        Rb = xa[0];
        switch (Rb) {
        case 0:
            xa[0] = 1;
            xa[3] = 0x756e6547 & -1;
            xa[2] = 0x49656e69 & -1;
            xa[1] = 0x6c65746e & -1;
            break;
        case 1:
        default:
            xa[0] = (5 << 8) | (4 << 4) | 3;
            xa[3] = 8 << 8;
            xa[1] = 0;
            xa[2] = (1 << 4);
            break;
        }
    }
    function rf(base) {
        var sf, tf;
        if (base == 0) Cc(0);
        sf = xa[0] & 0xff;
        tf = (sf / base) & -1;
        sf = (sf % base);
        xa[0] = (xa[0] & ~0xffff) | sf | (tf << 8);
        za = (((sf) << 24) >> 24);
        Aa = 12;
    }
    function uf(base) {
        var sf, tf;
        sf = xa[0] & 0xff;
        tf = (xa[0] >> 8) & 0xff;
        sf = (tf * base + sf) & 0xff;
        xa[0] = (xa[0] & ~0xffff) | sf;
        za = (((sf) << 24) >> 24);
        Aa = 12;
    }
    function vf() {
        var wf, sf, tf, xf, id;
        id = gd();
        xf = id & 0x0010;
        sf = xa[0] & 0xff;
        tf = (xa[0] >> 8) & 0xff;
        wf = (sf > 0xf9);
        if (((sf & 0x0f) > 9) || xf) {
            sf = (sf + 6) & 0x0f;
            tf = (tf + 1 + wf) & 0xff;
            id |= 0x0001 | 0x0010;
        } else {
            id &= ~ (0x0001 | 0x0010);
            sf &= 0x0f;
        }
        xa[0] = (xa[0] & ~0xffff) | sf | (tf << 8);
        ya = id;
        za = ((ya >> 6) & 1) ^ 1;
        Aa = 24;
    }
    function yf() {
        var wf, sf, tf, xf, id;
        id = gd();
        xf = id & 0x0010;
        sf = xa[0] & 0xff;
        tf = (xa[0] >> 8) & 0xff;
        wf = (sf < 6);
        if (((sf & 0x0f) > 9) || xf) {
            sf = (sf - 6) & 0x0f;
            tf = (tf - 1 - wf) & 0xff;
            id |= 0x0001 | 0x0010;
        } else {
            id &= ~ (0x0001 | 0x0010);
            sf &= 0x0f;
        }
        xa[0] = (xa[0] & ~0xffff) | sf | (tf << 8);
        ya = id;
        za = ((ya >> 6) & 1) ^ 1;
        Aa = 24;
    }
    function zf() {
        var sf, xf, Af, id;
        id = gd();
        Af = id & 0x0001;
        xf = id & 0x0010;
        sf = xa[0] & 0xff;
        id = 0;
        if (((sf & 0x0f) > 9) || xf) {
            sf = (sf + 6) & 0xff;
            id |= 0x0010;
        }
        if ((sf > 0x9f) || Af) {
            sf = (sf + 0x60) & 0xff;
            id |= 0x0001;
        }
        xa[0] = (xa[0] & ~0xff) | sf;
        id |= (sf == 0) << 6;
        id |= aa[sf] << 2;
        id |= (sf & 0x80);
        ya = id;
        za = ((ya >> 6) & 1) ^ 1;
        Aa = 24;
    }
    function Bf() {
        var sf, Cf, xf, Af, id;
        id = gd();
        Af = id & 0x0001;
        xf = id & 0x0010;
        sf = xa[0] & 0xff;
        id = 0;
        Cf = sf;
        if (((sf & 0x0f) > 9) || xf) {
            id |= 0x0010;
            if (sf < 6 || Af) id |= 0x0001;
            sf = (sf - 6) & 0xff;
        }
        if ((Cf > 0x99) || Af) {
            sf = (sf - 0x60) & 0xff;
            id |= 0x0001;
        }
        xa[0] = (xa[0] & ~0xff) | sf;
        id |= (sf == 0) << 6;
        id |= aa[sf] << 2;
        id |= (sf & 0x80);
        ya = id;
        za = ((ya >> 6) & 1) ^ 1;
        Aa = 24;
    }
    function Df() {
        var Ea, ga, Ha, Ia;
        Ea = Ta[Kb++];;
        if ((Ea >> 3) == 3) Cc(6);
        fa = Pb(Ea);
        ga = kb();
        fa = (fa + 4) & -1;
        Ha = kb();
        Ga = (Ea >> 3) & 7;
        Ia = xa[Ga];
        if (Ia < ga || Ia > Ha) Cc(5);
    }
    function Ef() {
        var Ea, ga, Ha, Ia;
        Ea = Ta[Kb++];;
        if ((Ea >> 3) == 3) Cc(6);
        fa = Pb(Ea);
        ga = (ib() << 16) >> 16;
        fa = (fa + 2) & -1;
        Ha = (ib() << 16) >> 16;
        Ga = (Ea >> 3) & 7;
        Ia = (xa[Ga] << 16) >> 16;
        if (Ia < ga || Ia > Ha) Cc(5);
    }
    function Ff() {
        var ga, Ha, Ga;
        Ha = (xa[4] - 16) >> 0;
        fa = ((Ha & Pa) + Oa) >> 0;
        for (Ga = 7; Ga >= 0; Ga--) {
            ga = xa[Ga];
            ub(ga);
            fa = (fa + 2) >> 0;
        }
        xa[4] = (xa[4] & ~Pa) | ((Ha) & Pa);
    }
    function Gf() {
        var ga, Ha, Ga;
        Ha = (xa[4] - 32) >> 0;
        fa = ((Ha & Pa) + Oa) >> 0;
        for (Ga = 7; Ga >= 0; Ga--) {
            ga = xa[Ga];
            wb(ga);
            fa = (fa + 4) >> 0;
        }
        xa[4] = (xa[4] & ~Pa) | ((Ha) & Pa);
    }
    function Hf() {
        var Ga;
        fa = ((xa[4] & Pa) + Oa) >> 0;
        for (Ga = 7; Ga >= 0; Ga--) {
            if (Ga != 4) {
                Wb(Ga, ib());
            }
            fa = (fa + 2) >> 0;
        }
        xa[4] = (xa[4] & ~Pa) | ((xa[4] + 16) & Pa);
    }
    function If() {
        var Ga;
        fa = ((xa[4] & Pa) + Oa) >> 0;
        for (Ga = 7; Ga >= 0; Ga--) {
            if (Ga != 4) {
                xa[Ga] = kb();
            }
            fa = (fa + 4) >> 0;
        }
        xa[4] = (xa[4] & ~Pa) | ((xa[4] + 32) & Pa);
    }
    function Jf() {
        var ga, Ha;
        Ha = xa[5];
        fa = ((Ha & Pa) + Oa) >> 0;
        ga = ib();
        Wb(5, ga);
        xa[4] = (xa[4] & ~Pa) | ((Ha + 2) & Pa);
    }
    function Kf() {
        var ga, Ha;
        Ha = xa[5];
        fa = ((Ha & Pa) + Oa) >> 0;
        ga = kb();
        xa[5] = ga;
        xa[4] = (xa[4] & ~Pa) | ((Ha + 4) & Pa);
    }
    function Lf() {
        var Ye, Mf, ke, Nf, ga, Of;
        Ye = Ob();
        Mf = Ta[Kb++];;
        Mf &= 0x1f;
        ke = xa[4];
        Nf = xa[5]; {
            ke = (ke - 2) >> 0;
            fa = ((ke & Pa) + Oa) >> 0;
            ub(Nf);
        };
        Of = ke;
        if (Mf != 0) {
            while (Mf > 1) {
                Nf = (Nf - 2) >> 0;
                fa = ((Nf & Pa) + Oa) >> 0;
                ga = ib(); {
                    ke = (ke - 2) >> 0;
                    fa = ((ke & Pa) + Oa) >> 0;
                    ub(ga);
                };
                Mf--;
            } {
                ke = (ke - 2) >> 0;
                fa = ((ke & Pa) + Oa) >> 0;
                ub(Of);
            };
        }
        ke = (ke - Ye) >> 0;
        fa = ((ke & Pa) + Oa) >> 0;
        ob();
        xa[5] = (xa[5] & ~Pa) | (Of & Pa);
        xa[4] = ke;
    }
    function Pf() {
        var Ye, Mf, ke, Nf, ga, Of;
        Ye = Ob();
        Mf = Ta[Kb++];;
        Mf &= 0x1f;
        ke = xa[4];
        Nf = xa[5]; {
            ke = (ke - 4) >> 0;
            fa = ((ke & Pa) + Oa) >> 0;
            wb(Nf);
        };
        Of = ke;
        if (Mf != 0) {
            while (Mf > 1) {
                Nf = (Nf - 4) >> 0;
                fa = ((Nf & Pa) + Oa) >> 0;
                ga = kb(); {
                    ke = (ke - 4) >> 0;
                    fa = ((ke & Pa) + Oa) >> 0;
                    wb(ga);
                };
                Mf--;
            } {
                ke = (ke - 4) >> 0;
                fa = ((ke & Pa) + Oa) >> 0;
                wb(Of);
            };
        }
        ke = (ke - Ye) >> 0;
        fa = ((ke & Pa) + Oa) >> 0;
        qb();
        xa[5] = (xa[5] & ~Pa) | (Of & Pa);
        xa[4] = (xa[4] & ~Pa) | ((ke) & Pa);
    }
    function Qf(Sb) {
        var ga, Ha, Ea;
        Ea = Ta[Kb++];;
        if ((Ea >> 3) == 3) Cc(6);
        fa = Pb(Ea);
        ga = kb();
        fa += 4;
        Ha = ib();
        Ge(Sb, Ha);
        xa[(Ea >> 3) & 7] = ga;
    }
    function Rf(Sb) {
        var ga, Ha, Ea;
        Ea = Ta[Kb++];;
        if ((Ea >> 3) == 3) Cc(6);
        fa = Pb(Ea);
        ga = ib();
        fa += 2;
        Ha = ib();
        Ge(Sb, Ha);
        Wb((Ea >> 3) & 7, ga);
    }
    function Sf() {
        var Tf, Uf, Vf, Wf, Sa, ga;
        Sa = (wa.eflags >> 12) & 3;
        if (wa.cpl > Sa) Cc(13);
        if (Da & 0x0080) Tf = 0xffff;
        else Tf = -1;
        Uf = xa[7];
        Vf = xa[2] & 0xffff;
        if (Da & (0x0010 | 0x0020)) {
            Wf = xa[1];
            if ((Wf & Tf) == 0) return;; {
                ga = wa.ld8_port(Vf);
                fa = ((Uf & Tf) + wa.segs[0].base) >> 0;
                sb(ga);
                xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 0)) & Tf);
                xa[1] = Wf = (Wf & ~Tf) | ((Wf - 1) & Tf);
                if (Wf & Tf) Kb = Mb;;
            }
        } else {
            ga = wa.ld8_port(Vf);
            fa = ((Uf & Tf) + wa.segs[0].base) >> 0;
            sb(ga);
            xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 0)) & Tf);
        }
    }
    function Xf() {
        var Tf, Yf, Sb, Wf, Vf, Sa, ga;
        Sa = (wa.eflags >> 12) & 3;
        if (wa.cpl > Sa) Cc(13);
        if (Da & 0x0080) Tf = 0xffff;
        else Tf = -1;
        Sb = Da & 0x000f;
        if (Sb == 0) Sb = 3;
        else Sb--;
        Yf = xa[6];
        Vf = xa[2] & 0xffff;
        if (Da & (0x0010 | 0x0020)) {
            Wf = xa[1];
            if ((Wf & Tf) == 0) return;;
            fa = ((Yf & Tf) + wa.segs[Sb].base) >> 0;
            ga = gb();
            wa.st8_port(Vf, ga);
            xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 0)) & Tf);
            xa[1] = Wf = (Wf & ~Tf) | ((Wf - 1) & Tf);
            if (Wf & Tf) Kb = Mb;;
        } else {
            fa = ((Yf & Tf) + wa.segs[Sb].base) >> 0;
            ga = gb();
            wa.st8_port(Vf, ga);
            xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 0)) & Tf);
        }
    }
    function Zf() {
        var Tf, Uf, Yf, Wf, Sb, ag;
        if (Da & 0x0080) Tf = 0xffff;
        else Tf = -1;
        Sb = Da & 0x000f;
        if (Sb == 0) Sb = 3;
        else Sb--;
        Yf = xa[6];
        Uf = xa[7];
        fa = ((Yf & Tf) + wa.segs[Sb].base) >> 0;
        ag = ((Uf & Tf) + wa.segs[0].base) >> 0;
        if (Da & (0x0010 | 0x0020)) {
            Wf = xa[1];
            if ((Wf & Tf) == 0) return;; {
                ga = gb();
                fa = ag;
                sb(ga);
                xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 0)) & Tf);
                xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 0)) & Tf);
                xa[1] = Wf = (Wf & ~Tf) | ((Wf - 1) & Tf);
                if (Wf & Tf) Kb = Mb;;
            }
        } else {
            ga = gb();
            fa = ag;
            sb(ga);
            xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 0)) & Tf);
            xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 0)) & Tf);
        }
    }
    function bg() {
        var Tf, Uf, Wf;
        if (Da & 0x0080) Tf = 0xffff;
        else Tf = -1;
        Uf = xa[7];
        fa = ((Uf & Tf) + wa.segs[0].base) >> 0;
        if (Da & (0x0010 | 0x0020)) {
            Wf = xa[1];
            if ((Wf & Tf) == 0) return;; {
                sb(xa[0]);
                xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 0)) & Tf);
                xa[1] = Wf = (Wf & ~Tf) | ((Wf - 1) & Tf);
                if (Wf & Tf) Kb = Mb;;
            }
        } else {
            sb(xa[0]);
            xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 0)) & Tf);
        }
    }
    function cg() {
        var Tf, Uf, Yf, Wf, Sb, ag;
        if (Da & 0x0080) Tf = 0xffff;
        else Tf = -1;
        Sb = Da & 0x000f;
        if (Sb == 0) Sb = 3;
        else Sb--;
        Yf = xa[6];
        Uf = xa[7];
        fa = ((Yf & Tf) + wa.segs[Sb].base) >> 0;
        ag = ((Uf & Tf) + wa.segs[0].base) >> 0;
        if (Da & (0x0010 | 0x0020)) {
            Wf = xa[1];
            if ((Wf & Tf) == 0) return;;
            ga = gb();
            fa = ag;
            Ha = gb();
            fc(7, ga, Ha);
            xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 0)) & Tf);
            xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 0)) & Tf);
            xa[1] = Wf = (Wf & ~Tf) | ((Wf - 1) & Tf);
            if (Da & 0x0010) {
                if (! (za == 0)) return;
            } else {
                if ((za == 0)) return;
            }
            if (Wf & Tf) Kb = Mb;;
        } else {
            ga = gb();
            fa = ag;
            Ha = gb();
            fc(7, ga, Ha);
            xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 0)) & Tf);
            xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 0)) & Tf);
        }
    }
    function dg() {
        var Tf, Yf, Sb, Wf, ga;
        if (Da & 0x0080) Tf = 0xffff;
        else Tf = -1;
        Sb = Da & 0x000f;
        if (Sb == 0) Sb = 3;
        else Sb--;
        Yf = xa[6];
        fa = ((Yf & Tf) + wa.segs[Sb].base) >> 0;
        if (Da & (0x0010 | 0x0020)) {
            Wf = xa[1];
            if ((Wf & Tf) == 0) return;;
            ga = gb();
            xa[0] = (xa[0] & -256) | ga;
            xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 0)) & Tf);
            xa[1] = Wf = (Wf & ~Tf) | ((Wf - 1) & Tf);
            if (Wf & Tf) Kb = Mb;;
        } else {
            ga = gb();
            xa[0] = (xa[0] & -256) | ga;
            xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 0)) & Tf);
        }
    }
    function eg() {
        var Tf, Uf, Wf, ga;
        if (Da & 0x0080) Tf = 0xffff;
        else Tf = -1;
        Uf = xa[7];
        fa = ((Uf & Tf) + wa.segs[0].base) >> 0;
        if (Da & (0x0010 | 0x0020)) {
            Wf = xa[1];
            if ((Wf & Tf) == 0) return;;
            ga = gb();
            fc(7, xa[0], ga);
            xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 0)) & Tf);
            xa[1] = Wf = (Wf & ~Tf) | ((Wf - 1) & Tf);
            if (Da & 0x0010) {
                if (! (za == 0)) return;
            } else {
                if ((za == 0)) return;
            }
            if (Wf & Tf) Kb = Mb;;
        } else {
            ga = gb();
            fc(7, xa[0], ga);
            xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 0)) & Tf);
        }
    }
    function fg() {
        var Tf, Uf, Vf, Wf, Sa, ga;
        Sa = (wa.eflags >> 12) & 3;
        if (wa.cpl > Sa) Cc(13);
        if (Da & 0x0080) Tf = 0xffff;
        else Tf = -1;
        Uf = xa[7];
        Vf = xa[2] & 0xffff;
        if (Da & (0x0010 | 0x0020)) {
            Wf = xa[1];
            if ((Wf & Tf) == 0) return;; {
                ga = wa.ld16_port(Vf);
                fa = ((Uf & Tf) + wa.segs[0].base) >> 0;
                ub(ga);
                xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 1)) & Tf);
                xa[1] = Wf = (Wf & ~Tf) | ((Wf - 1) & Tf);
                if (Wf & Tf) Kb = Mb;;
            }
        } else {
            ga = wa.ld16_port(Vf);
            fa = ((Uf & Tf) + wa.segs[0].base) >> 0;
            ub(ga);
            xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 1)) & Tf);
        }
    }
    function gg() {
        var Tf, Yf, Sb, Wf, Vf, Sa, ga;
        Sa = (wa.eflags >> 12) & 3;
        if (wa.cpl > Sa) Cc(13);
        if (Da & 0x0080) Tf = 0xffff;
        else Tf = -1;
        Sb = Da & 0x000f;
        if (Sb == 0) Sb = 3;
        else Sb--;
        Yf = xa[6];
        Vf = xa[2] & 0xffff;
        if (Da & (0x0010 | 0x0020)) {
            Wf = xa[1];
            if ((Wf & Tf) == 0) return;;
            fa = ((Yf & Tf) + wa.segs[Sb].base) >> 0;
            ga = ib();
            wa.st16_port(Vf, ga);
            xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 1)) & Tf);
            xa[1] = Wf = (Wf & ~Tf) | ((Wf - 1) & Tf);
            if (Wf & Tf) Kb = Mb;;
        } else {
            fa = ((Yf & Tf) + wa.segs[Sb].base) >> 0;
            ga = ib();
            wa.st16_port(Vf, ga);
            xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 1)) & Tf);
        }
    }
    function hg() {
        var Tf, Uf, Yf, Wf, Sb, ag;
        if (Da & 0x0080) Tf = 0xffff;
        else Tf = -1;
        Sb = Da & 0x000f;
        if (Sb == 0) Sb = 3;
        else Sb--;
        Yf = xa[6];
        Uf = xa[7];
        fa = ((Yf & Tf) + wa.segs[Sb].base) >> 0;
        ag = ((Uf & Tf) + wa.segs[0].base) >> 0;
        if (Da & (0x0010 | 0x0020)) {
            Wf = xa[1];
            if ((Wf & Tf) == 0) return;; {
                ga = ib();
                fa = ag;
                ub(ga);
                xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 1)) & Tf);
                xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 1)) & Tf);
                xa[1] = Wf = (Wf & ~Tf) | ((Wf - 1) & Tf);
                if (Wf & Tf) Kb = Mb;;
            }
        } else {
            ga = ib();
            fa = ag;
            ub(ga);
            xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 1)) & Tf);
            xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 1)) & Tf);
        }
    }
    function ig() {
        var Tf, Uf, Wf;
        if (Da & 0x0080) Tf = 0xffff;
        else Tf = -1;
        Uf = xa[7];
        fa = ((Uf & Tf) + wa.segs[0].base) >> 0;
        if (Da & (0x0010 | 0x0020)) {
            Wf = xa[1];
            if ((Wf & Tf) == 0) return;; {
                ub(xa[0]);
                xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 1)) & Tf);
                xa[1] = Wf = (Wf & ~Tf) | ((Wf - 1) & Tf);
                if (Wf & Tf) Kb = Mb;;
            }
        } else {
            ub(xa[0]);
            xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 1)) & Tf);
        }
    }
    function jg() {
        var Tf, Uf, Yf, Wf, Sb, ag;
        if (Da & 0x0080) Tf = 0xffff;
        else Tf = -1;
        Sb = Da & 0x000f;
        if (Sb == 0) Sb = 3;
        else Sb--;
        Yf = xa[6];
        Uf = xa[7];
        fa = ((Yf & Tf) + wa.segs[Sb].base) >> 0;
        ag = ((Uf & Tf) + wa.segs[0].base) >> 0;
        if (Da & (0x0010 | 0x0020)) {
            Wf = xa[1];
            if ((Wf & Tf) == 0) return;;
            ga = ib();
            fa = ag;
            Ha = ib();
            cc(7, ga, Ha);
            xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 1)) & Tf);
            xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 1)) & Tf);
            xa[1] = Wf = (Wf & ~Tf) | ((Wf - 1) & Tf);
            if (Da & 0x0010) {
                if (! (za == 0)) return;
            } else {
                if ((za == 0)) return;
            }
            if (Wf & Tf) Kb = Mb;;
        } else {
            ga = ib();
            fa = ag;
            Ha = ib();
            cc(7, ga, Ha);
            xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 1)) & Tf);
            xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 1)) & Tf);
        }
    }
    function kg() {
        var Tf, Yf, Sb, Wf, ga;
        if (Da & 0x0080) Tf = 0xffff;
        else Tf = -1;
        Sb = Da & 0x000f;
        if (Sb == 0) Sb = 3;
        else Sb--;
        Yf = xa[6];
        fa = ((Yf & Tf) + wa.segs[Sb].base) >> 0;
        if (Da & (0x0010 | 0x0020)) {
            Wf = xa[1];
            if ((Wf & Tf) == 0) return;;
            ga = ib();
            xa[0] = (xa[0] & -65536) | ga;
            xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 1)) & Tf);
            xa[1] = Wf = (Wf & ~Tf) | ((Wf - 1) & Tf);
            if (Wf & Tf) Kb = Mb;;
        } else {
            ga = ib();
            xa[0] = (xa[0] & -65536) | ga;
            xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 1)) & Tf);
        }
    }
    function lg() {
        var Tf, Uf, Wf, ga;
        if (Da & 0x0080) Tf = 0xffff;
        else Tf = -1;
        Uf = xa[7];
        fa = ((Uf & Tf) + wa.segs[0].base) >> 0;
        if (Da & (0x0010 | 0x0020)) {
            Wf = xa[1];
            if ((Wf & Tf) == 0) return;;
            ga = ib();
            cc(7, xa[0], ga);
            xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 1)) & Tf);
            xa[1] = Wf = (Wf & ~Tf) | ((Wf - 1) & Tf);
            if (Da & 0x0010) {
                if (! (za == 0)) return;
            } else {
                if ((za == 0)) return;
            }
            if (Wf & Tf) Kb = Mb;;
        } else {
            ga = ib();
            cc(7, xa[0], ga);
            xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 1)) & Tf);
        }
    }
    function mg() {
        var Tf, Uf, Vf, Wf, Sa, ga;
        Sa = (wa.eflags >> 12) & 3;
        if (wa.cpl > Sa) Cc(13);
        if (Da & 0x0080) Tf = 0xffff;
        else Tf = -1;
        Uf = xa[7];
        Vf = xa[2] & 0xffff;
        if (Da & (0x0010 | 0x0020)) {
            Wf = xa[1];
            if ((Wf & Tf) == 0) return;;
            if (Tf == -1 && wa.df == 1 && (fa & 3) == 0) {
                var ng, l, og, i, pg, ga, qg;
                ng = Wf >>> 0;
                l = (4096 - (fa & 0xfff)) >> 2;
                if (ng > l) ng = l;
                og = sd(xa[7], 1);
                qg = wa.ld32_port;
                og >>= 2;
                for (i = 0; i < ng; i++) {
                    ga = qg(Vf);
                    Wa[og + i] = ga;
                }
                pg = ng << 2;
                xa[7] = (Uf + pg) >> 0;
                xa[1] = Wf = (Wf - ng) >> 0;
                if (Wf) Kb = Mb;
            } else {
                ga = wa.ld32_port(Vf);
                fa = ((Uf & Tf) + wa.segs[0].base) >> 0;
                wb(ga);
                xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 2)) & Tf);
                xa[1] = Wf = (Wf & ~Tf) | ((Wf - 1) & Tf);
                if (Wf & Tf) Kb = Mb;;
            }
        } else {
            ga = wa.ld32_port(Vf);
            fa = ((Uf & Tf) + wa.segs[0].base) >> 0;
            wb(ga);
            xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 2)) & Tf);
        }
    }
    function rg() {
        var Tf, Yf, Sb, Wf, Vf, Sa, ga;
        Sa = (wa.eflags >> 12) & 3;
        if (wa.cpl > Sa) Cc(13);
        if (Da & 0x0080) Tf = 0xffff;
        else Tf = -1;
        Sb = Da & 0x000f;
        if (Sb == 0) Sb = 3;
        else Sb--;
        Yf = xa[6];
        Vf = xa[2] & 0xffff;
        if (Da & (0x0010 | 0x0020)) {
            Wf = xa[1];
            if ((Wf & Tf) == 0) return;;
            fa = ((Yf & Tf) + wa.segs[Sb].base) >> 0;
            ga = kb();
            wa.st32_port(Vf, ga);
            xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 2)) & Tf);
            xa[1] = Wf = (Wf & ~Tf) | ((Wf - 1) & Tf);
            if (Wf & Tf) Kb = Mb;;
        } else {
            fa = ((Yf & Tf) + wa.segs[Sb].base) >> 0;
            ga = kb();
            wa.st32_port(Vf, ga);
            xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 2)) & Tf);
        }
    }
    function sg() {
        var Tf, Uf, Yf, Wf, Sb, ag;
        if (Da & 0x0080) Tf = 0xffff;
        else Tf = -1;
        Sb = Da & 0x000f;
        if (Sb == 0) Sb = 3;
        else Sb--;
        Yf = xa[6];
        Uf = xa[7];
        fa = ((Yf & Tf) + wa.segs[Sb].base) >> 0;
        ag = ((Uf & Tf) + wa.segs[0].base) >> 0;
        if (Da & (0x0010 | 0x0020)) {
            Wf = xa[1];
            if ((Wf & Tf) == 0) return;;
            if (Tf == -1 && wa.df == 1 && ((fa | ag) & 3) == 0) {
                var ng, l, tg, og, i, pg;
                ng = Wf >>> 0;
                l = (4096 - (fa & 0xfff)) >> 2;
                if (ng > l) ng = l;
                l = (4096 - (ag & 0xfff)) >> 2;
                if (ng > l) ng = l;
                tg = sd(fa, 0);
                og = sd(ag, 1);
                pg = ng << 2;
                og >>= 2;
                tg >>= 2;
                for (i = 0; i < ng; i++) Wa[og + i] = Wa[tg + i];
                xa[6] = (Yf + pg) >> 0;
                xa[7] = (Uf + pg) >> 0;
                xa[1] = Wf = (Wf - ng) >> 0;
                if (Wf) Kb = Mb;
            } else {
                ga = kb();
                fa = ag;
                wb(ga);
                xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 2)) & Tf);
                xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 2)) & Tf);
                xa[1] = Wf = (Wf & ~Tf) | ((Wf - 1) & Tf);
                if (Wf & Tf) Kb = Mb;;
            }
        } else {
            ga = kb();
            fa = ag;
            wb(ga);
            xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 2)) & Tf);
            xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 2)) & Tf);
        }
    }
    function ug() {
        var Tf, Uf, Wf;
        if (Da & 0x0080) Tf = 0xffff;
        else Tf = -1;
        Uf = xa[7];
        fa = ((Uf & Tf) + wa.segs[0].base) >> 0;
        if (Da & (0x0010 | 0x0020)) {
            Wf = xa[1];
            if ((Wf & Tf) == 0) return;;
            if (Tf == -1 && wa.df == 1 && (fa & 3) == 0) {
                var ng, l, og, i, pg, ga;
                ng = Wf >>> 0;
                l = (4096 - (fa & 0xfff)) >> 2;
                if (ng > l) ng = l;
                og = sd(xa[7], 1);
                ga = xa[0];
                og >>= 2;
                for (i = 0; i < ng; i++) Wa[og + i] = ga;
                pg = ng << 2;
                xa[7] = (Uf + pg) >> 0;
                xa[1] = Wf = (Wf - ng) >> 0;
                if (Wf) Kb = Mb;
            } else {
                wb(xa[0]);
                xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 2)) & Tf);
                xa[1] = Wf = (Wf & ~Tf) | ((Wf - 1) & Tf);
                if (Wf & Tf) Kb = Mb;;
            }
        } else {
            wb(xa[0]);
            xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 2)) & Tf);
        }
    }
    function vg() {
        var Tf, Uf, Yf, Wf, Sb, ag;
        if (Da & 0x0080) Tf = 0xffff;
        else Tf = -1;
        Sb = Da & 0x000f;
        if (Sb == 0) Sb = 3;
        else Sb--;
        Yf = xa[6];
        Uf = xa[7];
        fa = ((Yf & Tf) + wa.segs[Sb].base) >> 0;
        ag = ((Uf & Tf) + wa.segs[0].base) >> 0;
        if (Da & (0x0010 | 0x0020)) {
            Wf = xa[1];
            if ((Wf & Tf) == 0) return;;
            ga = kb();
            fa = ag;
            Ha = kb();
            Xb(7, ga, Ha);
            xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 2)) & Tf);
            xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 2)) & Tf);
            xa[1] = Wf = (Wf & ~Tf) | ((Wf - 1) & Tf);
            if (Da & 0x0010) {
                if (! (za == 0)) return;
            } else {
                if ((za == 0)) return;
            }
            if (Wf & Tf) Kb = Mb;;
        } else {
            ga = kb();
            fa = ag;
            Ha = kb();
            Xb(7, ga, Ha);
            xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 2)) & Tf);
            xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 2)) & Tf);
        }
    }
    function wg() {
        var Tf, Yf, Sb, Wf, ga;
        if (Da & 0x0080) Tf = 0xffff;
        else Tf = -1;
        Sb = Da & 0x000f;
        if (Sb == 0) Sb = 3;
        else Sb--;
        Yf = xa[6];
        fa = ((Yf & Tf) + wa.segs[Sb].base) >> 0;
        if (Da & (0x0010 | 0x0020)) {
            Wf = xa[1];
            if ((Wf & Tf) == 0) return;;
            ga = kb();
            xa[0] = ga;
            xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 2)) & Tf);
            xa[1] = Wf = (Wf & ~Tf) | ((Wf - 1) & Tf);
            if (Wf & Tf) Kb = Mb;;
        } else {
            ga = kb();
            xa[0] = ga;
            xa[6] = (Yf & ~Tf) | ((Yf + (wa.df << 2)) & Tf);
        }
    }
    function xg() {
        var Tf, Uf, Wf, ga;
        if (Da & 0x0080) Tf = 0xffff;
        else Tf = -1;
        Uf = xa[7];
        fa = ((Uf & Tf) + wa.segs[0].base) >> 0;
        if (Da & (0x0010 | 0x0020)) {
            Wf = xa[1];
            if ((Wf & Tf) == 0) return;;
            ga = kb();
            Xb(7, xa[0], ga);
            xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 2)) & Tf);
            xa[1] = Wf = (Wf & ~Tf) | ((Wf - 1) & Tf);
            if (Da & 0x0010) {
                if (! (za == 0)) return;
            } else {
                if ((za == 0)) return;
            }
            if (Wf & Tf) Kb = Mb;;
        } else {
            ga = kb();
            Xb(7, xa[0], ga);
            xa[7] = (Uf & ~Tf) | ((Uf + (wa.df << 2)) & Tf);
        }
    }
    wa = this;
    Ta = this.phys_mem8;
    Va = this.phys_mem16;
    Wa = this.phys_mem32;
    Za = this.tlb_read_user;
    ab = this.tlb_write_user;
    Xa = this.tlb_read_kernel;
    Ya = this.tlb_write_kernel;
    if (wa.cpl == 3) {
        bb = Za;
        cb = ab;
    } else {
        bb = Xa;
        cb = Ya;
    }
    if (wa.halted) {
        if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) {
            wa.halted = 0;
        } else {
            return 257;
        }
    }
    xa = this.regs;
    ya = this.cc_src;
    za = this.cc_dst;
    Aa = this.cc_op;
    Ba = this.cc_op2;
    Ca = this.cc_dst2;
    Jb = this.eip;
    be();
    La = 256;
    Ka = ua;
    if (va) {;
        ze(va.intno, 0, va.error_code, 0, 0);
    }
    if (wa.hard_intno >= 0) {;
        ze(wa.hard_intno, 0, 0, 0, 1);
        wa.hard_intno = -1;
    }
    if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) {
        wa.hard_intno = wa.get_hard_intno();;
        ze(wa.hard_intno, 0, 0, 0, 1);
        wa.hard_intno = -1;
    }
    Kb = 0;
    Mb = 0;
    yg: do {;
        Jb = (Jb + Kb - Mb) >> 0;
        Nb = (Jb + Na) >> 0;
        Lb = bb[Nb >>> 12];
        if (((Lb | Nb) & 0xfff) >= (4096 - 15 + 1)) {
            var zg;
            if (Lb == -1) fb(Nb, 0, wa.cpl == 3);
            Lb = bb[Nb >>> 12];
            Mb = Kb = Nb ^ Lb;
            b = Ta[Kb++];;
            zg = Nb & 0xfff;
            if (zg >= (4096 - 15 + 1)) {
                ga = Bd(Nb, b);
                if ((zg + ga) > 4096) {
                    Mb = Kb = this.mem_size;
                    for (Ha = 0; Ha < ga; Ha++) {
                        fa = (Nb + Ha) >> 0;
                        Ta[Kb + Ha] = (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
                    }
                    Kb++;
                }
            }
        } else {
            Mb = Kb = Nb ^ Lb;
            b = Ta[Kb++];;
        }
        b |= (Da = Ra) & 0x0100;
        Ed: for (;;) {
            switch (b) {
            case 0x66:
                if (Da == Ra) Bd(Nb, b);
                if (Ra & 0x0100) Da &= ~0x0100;
                else Da |= 0x0100;
                b = Ta[Kb++];;
                b |= (Da & 0x0100);
                break;
            case 0x67:
                if (Da == Ra) Bd(Nb, b);
                if (Ra & 0x0080) Da &= ~0x0080;
                else Da |= 0x0080;
                b = Ta[Kb++];;
                b |= (Da & 0x0100);
                break;
            case 0xf0:
                if (Da == Ra) Bd(Nb, b);
                Da |= 0x0040;
                b = Ta[Kb++];;
                b |= (Da & 0x0100);
                break;
            case 0xf2:
                if (Da == Ra) Bd(Nb, b);
                Da |= 0x0020;
                b = Ta[Kb++];;
                b |= (Da & 0x0100);
                break;
            case 0xf3:
                if (Da == Ra) Bd(Nb, b);
                Da |= 0x0010;
                b = Ta[Kb++];;
                b |= (Da & 0x0100);
                break;
            case 0x26:
            case 0x2e:
            case 0x36:
            case 0x3e:
                if (Da == Ra) Bd(Nb, b);
                Da = (Da & ~0x000f) | (((b >> 3) & 3) + 1);
                b = Ta[Kb++];;
                b |= (Da & 0x0100);;
                break;
            case 0x64:
            case 0x65:
                if (Da == Ra) Bd(Nb, b);
                Da = (Da & ~0x000f) | ((b & 7) + 1);
                b = Ta[Kb++];;
                b |= (Da & 0x0100);;
                break;
            case 0xb0:
            case 0xb1:
            case 0xb2:
            case 0xb3:
            case 0xb4:
            case 0xb5:
            case 0xb6:
            case 0xb7:
                ga = Ta[Kb++];;
                b &= 7;
                Ua = (b & 4) << 1;
                xa[b & 3] = (xa[b & 3] & ~ (0xff << Ua)) | (((ga) & 0xff) << Ua);
                break Ed;
            case 0xb8:
            case 0xb9:
            case 0xba:
            case 0xbb:
            case 0xbc:
            case 0xbd:
            case 0xbe:
            case 0xbf:
                {
                    ga = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                    Kb += 4;
                };
                xa[b & 7] = ga;
                break Ed;
            case 0x88:
                Ea = Ta[Kb++];;
                Ga = (Ea >> 3) & 7;
                ga = (xa[Ga & 3] >> ((Ga & 4) << 1));
                if ((Ea >> 6) == 3) {
                    Fa = Ea & 7;
                    Ua = (Fa & 4) << 1;
                    xa[Fa & 3] = (xa[Fa & 3] & ~ (0xff << Ua)) | (((ga) & 0xff) << Ua);
                } else {
                    fa = Pb(Ea); {
                        Ua = cb[fa >>> 12];
                        if (Ua == -1) {
                            rb(ga);
                        } else {
                            Ta[fa ^ Ua] = ga;
                        }
                    };
                }
                break Ed;
            case 0x89:
                Ea = Ta[Kb++];;
                ga = xa[(Ea >> 3) & 7];
                if ((Ea >> 6) == 3) {
                    xa[Ea & 7] = ga;
                } else {
                    fa = Pb(Ea); {
                        Ua = cb[fa >>> 12];
                        if ((Ua | fa) & 3) {
                            vb(ga);
                        } else {
                            Wa[(fa ^ Ua) >> 2] = ga;
                        }
                    };
                }
                break Ed;
            case 0x8a:
                Ea = Ta[Kb++];;
                if ((Ea >> 6) == 3) {
                    Fa = Ea & 7;
                    ga = (xa[Fa & 3] >> ((Fa & 4) << 1));
                } else {
                    fa = Pb(Ea);
                    ga = (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
                }
                Ga = (Ea >> 3) & 7;
                Ua = (Ga & 4) << 1;
                xa[Ga & 3] = (xa[Ga & 3] & ~ (0xff << Ua)) | (((ga) & 0xff) << Ua);
                break Ed;
            case 0x8b:
                Ea = Ta[Kb++];;
                if ((Ea >> 6) == 3) {
                    ga = xa[Ea & 7];
                } else {
                    fa = Pb(Ea);
                    ga = (((Ua = bb[fa >>> 12]) | fa) & 3 ? jb() : Wa[(fa ^ Ua) >> 2]);
                }
                xa[(Ea >> 3) & 7] = ga;
                break Ed;
            case 0xa0:
                fa = Ub();
                ga = gb();
                xa[0] = (xa[0] & -256) | ga;
                break Ed;
            case 0xa1:
                fa = Ub();
                ga = kb();
                xa[0] = ga;
                break Ed;
            case 0xa2:
                fa = Ub();
                sb(xa[0]);
                break Ed;
            case 0xa3:
                fa = Ub();
                wb(xa[0]);
                break Ed;
            case 0xd7:
                fa = (xa[3] + (xa[0] & 0xff)) >> 0;
                if (Da & 0x0080) fa &= 0xffff;
                Ga = Da & 0x000f;
                if (Ga == 0) Ga = 3;
                else Ga--;
                fa = (fa + wa.segs[Ga].base) >> 0;
                ga = gb();
                Vb(0, ga);
                break Ed;
            case 0xc6:
                Ea = Ta[Kb++];;
                if ((Ea >> 6) == 3) {
                    ga = Ta[Kb++];;
                    Vb(Ea & 7, ga);
                } else {
                    fa = Pb(Ea);
                    ga = Ta[Kb++];;
                    sb(ga);
                }
                break Ed;
            case 0xc7:
                Ea = Ta[Kb++];;
                if ((Ea >> 6) == 3) {
                    {
                        ga = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                        Kb += 4;
                    };
                    xa[Ea & 7] = ga;
                } else {
                    fa = Pb(Ea); {
                        ga = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                        Kb += 4;
                    };
                    wb(ga);
                }
                break Ed;
            case 0x91:
            case 0x92:
            case 0x93:
            case 0x94:
            case 0x95:
            case 0x96:
            case 0x97:
                Ga = b & 7;
                ga = xa[0];
                xa[0] = xa[Ga];
                xa[Ga] = ga;
                break Ed;
            case 0x86:
                Ea = Ta[Kb++];;
                Ga = (Ea >> 3) & 7;
                if ((Ea >> 6) == 3) {
                    Fa = Ea & 7;
                    ga = (xa[Fa & 3] >> ((Fa & 4) << 1));
                    Vb(Fa, (xa[Ga & 3] >> ((Ga & 4) << 1)));
                } else {
                    fa = Pb(Ea);
                    ga = mb();
                    sb((xa[Ga & 3] >> ((Ga & 4) << 1)));
                }
                Vb(Ga, ga);
                break Ed;
            case 0x87:
                Ea = Ta[Kb++];;
                Ga = (Ea >> 3) & 7;
                if ((Ea >> 6) == 3) {
                    Fa = Ea & 7;
                    ga = xa[Fa];
                    xa[Fa] = xa[Ga];
                } else {
                    fa = Pb(Ea);
                    ga = qb();
                    wb(xa[Ga]);
                }
                xa[Ga] = ga;
                break Ed;
            case 0x8e:
                Ea = Ta[Kb++];;
                Ga = (Ea >> 3) & 7;
                if (Ga >= 6 || Ga == 1) Cc(6);
                if ((Ea >> 6) == 3) {
                    ga = xa[Ea & 7] & 0xffff;
                } else {
                    fa = Pb(Ea);
                    ga = ib();
                }
                Ge(Ga, ga);
                break Ed;
            case 0x8c:
                Ea = Ta[Kb++];;
                Ga = (Ea >> 3) & 7;
                if (Ga >= 6) Cc(6);
                ga = wa.segs[Ga].selector;
                if ((Ea >> 6) == 3) {
                    if ((((Da >> 8) & 1) ^ 1)) {
                        xa[Ea & 7] = ga;
                    } else {
                        Wb(Ea & 7, ga);
                    }
                } else {
                    fa = Pb(Ea);
                    ub(ga);
                }
                break Ed;
            case 0xc4:
                Qf(0);
                break Ed;
            case 0xc5:
                Qf(3);
                break Ed;
            case 0x00:
            case 0x08:
            case 0x10:
            case 0x18:
            case 0x20:
            case 0x28:
            case 0x30:
            case 0x38:
                Ea = Ta[Kb++];;
                Ja = b >> 3;
                Ga = (Ea >> 3) & 7;
                Ha = (xa[Ga & 3] >> ((Ga & 4) << 1));
                if ((Ea >> 6) == 3) {
                    Fa = Ea & 7;
                    Vb(Fa, fc(Ja, (xa[Fa & 3] >> ((Fa & 4) << 1)), Ha));
                } else {
                    fa = Pb(Ea);
                    if (Ja != 7) {
                        ga = mb();
                        ga = fc(Ja, ga, Ha);
                        sb(ga);
                    } else {
                        ga = gb();
                        fc(7, ga, Ha);
                    }
                }
                break Ed;
            case 0x01:
                Ea = Ta[Kb++];;
                Ha = xa[(Ea >> 3) & 7];
                if ((Ea >> 6) == 3) {
                    Fa = Ea & 7; {
                        ya = Ha;
                        za = xa[Fa] = (xa[Fa] + ya) >> 0;
                        Aa = 2;
                    };
                } else {
                    fa = Pb(Ea);
                    ga = qb(); {
                        ya = Ha;
                        za = ga = (ga + ya) >> 0;
                        Aa = 2;
                    };
                    wb(ga);
                }
                break Ed;
            case 0x09:
            case 0x11:
            case 0x19:
            case 0x21:
            case 0x29:
            case 0x31:
                Ea = Ta[Kb++];;
                Ja = b >> 3;
                Ha = xa[(Ea >> 3) & 7];
                if ((Ea >> 6) == 3) {
                    Fa = Ea & 7;
                    xa[Fa] = Xb(Ja, xa[Fa], Ha);
                } else {
                    fa = Pb(Ea);
                    ga = qb();
                    ga = Xb(Ja, ga, Ha);
                    wb(ga);
                }
                break Ed;
            case 0x39:
                Ea = Ta[Kb++];;
                Ja = b >> 3;
                Ha = xa[(Ea >> 3) & 7];
                if ((Ea >> 6) == 3) {
                    Fa = Ea & 7; {
                        ya = Ha;
                        za = (xa[Fa] - ya) >> 0;
                        Aa = 8;
                    };
                } else {
                    fa = Pb(Ea);
                    ga = kb(); {
                        ya = Ha;
                        za = (ga - ya) >> 0;
                        Aa = 8;
                    };
                }
                break Ed;
            case 0x02:
            case 0x0a:
            case 0x12:
            case 0x1a:
            case 0x22:
            case 0x2a:
            case 0x32:
            case 0x3a:
                Ea = Ta[Kb++];;
                Ja = b >> 3;
                Ga = (Ea >> 3) & 7;
                if ((Ea >> 6) == 3) {
                    Fa = Ea & 7;
                    Ha = (xa[Fa & 3] >> ((Fa & 4) << 1));
                } else {
                    fa = Pb(Ea);
                    Ha = gb();
                }
                Vb(Ga, fc(Ja, (xa[Ga & 3] >> ((Ga & 4) << 1)), Ha));
                break Ed;
            case 0x03:
                Ea = Ta[Kb++];;
                Ga = (Ea >> 3) & 7;
                if ((Ea >> 6) == 3) {
                    Ha = xa[Ea & 7];
                } else {
                    fa = Pb(Ea);
                    Ha = kb();
                } {
                    ya = Ha;
                    za = xa[Ga] = (xa[Ga] + ya) >> 0;
                    Aa = 2;
                };
                break Ed;
            case 0x0b:
            case 0x13:
            case 0x1b:
            case 0x23:
            case 0x2b:
            case 0x33:
                Ea = Ta[Kb++];;
                Ja = b >> 3;
                Ga = (Ea >> 3) & 7;
                if ((Ea >> 6) == 3) {
                    Ha = xa[Ea & 7];
                } else {
                    fa = Pb(Ea);
                    Ha = kb();
                }
                xa[Ga] = Xb(Ja, xa[Ga], Ha);
                break Ed;
            case 0x3b:
                Ea = Ta[Kb++];;
                Ja = b >> 3;
                Ga = (Ea >> 3) & 7;
                if ((Ea >> 6) == 3) {
                    Ha = xa[Ea & 7];
                } else {
                    fa = Pb(Ea);
                    Ha = kb();
                } {
                    ya = Ha;
                    za = (xa[Ga] - ya) >> 0;
                    Aa = 8;
                };
                break Ed;
            case 0x04:
            case 0x0c:
            case 0x14:
            case 0x1c:
            case 0x24:
            case 0x2c:
            case 0x34:
            case 0x3c:
                Ha = Ta[Kb++];;
                Ja = b >> 3;
                Vb(0, fc(Ja, xa[0] & 0xff, Ha));
                break Ed;
            case 0x05:
                {
                    Ha = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                    Kb += 4;
                }; {
                    ya = Ha;
                    za = xa[0] = (xa[0] + ya) >> 0;
                    Aa = 2;
                };
                break Ed;
            case 0x0d:
            case 0x15:
            case 0x1d:
            case 0x25:
            case 0x2d:
                {
                    Ha = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                    Kb += 4;
                };
                Ja = b >> 3;
                xa[0] = Xb(Ja, xa[0], Ha);
                break Ed;
            case 0x35:
                {
                    Ha = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                    Kb += 4;
                }; {
                    za = xa[0] = xa[0] ^ Ha;
                    Aa = 14;
                };
                break Ed;
            case 0x3d:
                {
                    Ha = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                    Kb += 4;
                }; {
                    ya = Ha;
                    za = (xa[0] - ya) >> 0;
                    Aa = 8;
                };
                break Ed;
            case 0x80:
            case 0x82:
                Ea = Ta[Kb++];;
                Ja = (Ea >> 3) & 7;
                if ((Ea >> 6) == 3) {
                    Fa = Ea & 7;
                    Ha = Ta[Kb++];;
                    Vb(Fa, fc(Ja, (xa[Fa & 3] >> ((Fa & 4) << 1)), Ha));
                } else {
                    fa = Pb(Ea);
                    Ha = Ta[Kb++];;
                    if (Ja != 7) {
                        ga = mb();
                        ga = fc(Ja, ga, Ha);
                        sb(ga);
                    } else {
                        ga = gb();
                        fc(7, ga, Ha);
                    }
                }
                break Ed;
            case 0x81:
                Ea = Ta[Kb++];;
                Ja = (Ea >> 3) & 7;
                if (Ja == 7) {
                    if ((Ea >> 6) == 3) {
                        ga = xa[Ea & 7];
                    } else {
                        fa = Pb(Ea);
                        ga = kb();
                    } {
                        Ha = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                        Kb += 4;
                    }; {
                        ya = Ha;
                        za = (ga - ya) >> 0;
                        Aa = 8;
                    };
                } else {
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7; {
                            Ha = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                            Kb += 4;
                        };
                        xa[Fa] = Xb(Ja, xa[Fa], Ha);
                    } else {
                        fa = Pb(Ea); {
                            Ha = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                            Kb += 4;
                        };
                        ga = qb();
                        ga = Xb(Ja, ga, Ha);
                        wb(ga);
                    }
                }
                break Ed;
            case 0x83:
                Ea = Ta[Kb++];;
                Ja = (Ea >> 3) & 7;
                if (Ja == 7) {
                    if ((Ea >> 6) == 3) {
                        ga = xa[Ea & 7];
                    } else {
                        fa = Pb(Ea);
                        ga = kb();
                    }
                    Ha = ((Ta[Kb++] << 24) >> 24);; {
                        ya = Ha;
                        za = (ga - ya) >> 0;
                        Aa = 8;
                    };
                } else {
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        Ha = ((Ta[Kb++] << 24) >> 24);;
                        xa[Fa] = Xb(Ja, xa[Fa], Ha);
                    } else {
                        fa = Pb(Ea);
                        Ha = ((Ta[Kb++] << 24) >> 24);;
                        ga = qb();
                        ga = Xb(Ja, ga, Ha);
                        wb(ga);
                    }
                }
                break Ed;
            case 0x40:
            case 0x41:
            case 0x42:
            case 0x43:
            case 0x44:
            case 0x45:
            case 0x46:
            case 0x47:
                Ga = b & 7; {
                    if (Aa < 25) {
                        Ba = Aa;
                        Ca = za;
                    }
                    xa[Ga] = za = (xa[Ga] + 1) >> 0;
                    Aa = 27;
                };
                break Ed;
            case 0x48:
            case 0x49:
            case 0x4a:
            case 0x4b:
            case 0x4c:
            case 0x4d:
            case 0x4e:
            case 0x4f:
                Ga = b & 7; {
                    if (Aa < 25) {
                        Ba = Aa;
                        Ca = za;
                    }
                    xa[Ga] = za = (xa[Ga] - 1) >> 0;
                    Aa = 30;
                };
                break Ed;
            case 0x6b:
                Ea = Ta[Kb++];;
                Ga = (Ea >> 3) & 7;
                if ((Ea >> 6) == 3) {
                    Ha = xa[Ea & 7];
                } else {
                    fa = Pb(Ea);
                    Ha = kb();
                }
                Ia = ((Ta[Kb++] << 24) >> 24);;
                xa[Ga] = Vc(Ha, Ia);
                break Ed;
            case 0x69:
                Ea = Ta[Kb++];;
                Ga = (Ea >> 3) & 7;
                if ((Ea >> 6) == 3) {
                    Ha = xa[Ea & 7];
                } else {
                    fa = Pb(Ea);
                    Ha = kb();
                } {
                    Ia = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                    Kb += 4;
                };
                xa[Ga] = Vc(Ha, Ia);
                break Ed;
            case 0x84:
                Ea = Ta[Kb++];;
                if ((Ea >> 6) == 3) {
                    Fa = Ea & 7;
                    ga = (xa[Fa & 3] >> ((Fa & 4) << 1));
                } else {
                    fa = Pb(Ea);
                    ga = gb();
                }
                Ga = (Ea >> 3) & 7;
                Ha = (xa[Ga & 3] >> ((Ga & 4) << 1)); {
                    za = (((ga & Ha) << 24) >> 24);
                    Aa = 12;
                };
                break Ed;
            case 0x85:
                Ea = Ta[Kb++];;
                if ((Ea >> 6) == 3) {
                    ga = xa[Ea & 7];
                } else {
                    fa = Pb(Ea);
                    ga = kb();
                }
                Ha = xa[(Ea >> 3) & 7]; {
                    za = ga & Ha;
                    Aa = 14;
                };
                break Ed;
            case 0xa8:
                Ha = Ta[Kb++];; {
                    za = (((xa[0] & Ha) << 24) >> 24);
                    Aa = 12;
                };
                break Ed;
            case 0xa9:
                {
                    Ha = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                    Kb += 4;
                }; {
                    za = xa[0] & Ha;
                    Aa = 14;
                };
                break Ed;
            case 0xf6:
                Ea = Ta[Kb++];;
                Ja = (Ea >> 3) & 7;
                switch (Ja) {
                case 0:
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        ga = (xa[Fa & 3] >> ((Fa & 4) << 1));
                    } else {
                        fa = Pb(Ea);
                        ga = gb();
                    }
                    Ha = Ta[Kb++];; {
                        za = (((ga & Ha) << 24) >> 24);
                        Aa = 12;
                    };
                    break;
                case 2:
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        Vb(Fa, ~ (xa[Fa & 3] >> ((Fa & 4) << 1)));
                    } else {
                        fa = Pb(Ea);
                        ga = mb();
                        ga = ~ga;
                        sb(ga);
                    }
                    break;
                case 3:
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        Vb(Fa, fc(5, 0, (xa[Fa & 3] >> ((Fa & 4) << 1))));
                    } else {
                        fa = Pb(Ea);
                        ga = mb();
                        ga = fc(5, 0, ga);
                        sb(ga);
                    }
                    break;
                case 4:
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        ga = (xa[Fa & 3] >> ((Fa & 4) << 1));
                    } else {
                        fa = Pb(Ea);
                        ga = gb();
                    }
                    Wb(0, Nc(xa[0], ga));
                    break;
                case 5:
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        ga = (xa[Fa & 3] >> ((Fa & 4) << 1));
                    } else {
                        fa = Pb(Ea);
                        ga = gb();
                    }
                    Wb(0, Oc(xa[0], ga));
                    break;
                case 6:
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        ga = (xa[Fa & 3] >> ((Fa & 4) << 1));
                    } else {
                        fa = Pb(Ea);
                        ga = gb();
                    }
                    Bc(ga);
                    break;
                case 7:
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        ga = (xa[Fa & 3] >> ((Fa & 4) << 1));
                    } else {
                        fa = Pb(Ea);
                        ga = gb();
                    }
                    Dc(ga);
                    break;
                default:
                    Cc(6);
                }
                break Ed;
            case 0xf7:
                Ea = Ta[Kb++];;
                Ja = (Ea >> 3) & 7;
                switch (Ja) {
                case 0:
                    if ((Ea >> 6) == 3) {
                        ga = xa[Ea & 7];
                    } else {
                        fa = Pb(Ea);
                        ga = kb();
                    } {
                        Ha = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                        Kb += 4;
                    }; {
                        za = ga & Ha;
                        Aa = 14;
                    };
                    break;
                case 2:
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        xa[Fa] = ~xa[Fa];
                    } else {
                        fa = Pb(Ea);
                        ga = qb();
                        ga = ~ga;
                        wb(ga);
                    }
                    break;
                case 3:
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        xa[Fa] = Xb(5, 0, xa[Fa]);
                    } else {
                        fa = Pb(Ea);
                        ga = qb();
                        ga = Xb(5, 0, ga);
                        wb(ga);
                    }
                    break;
                case 4:
                    if ((Ea >> 6) == 3) {
                        ga = xa[Ea & 7];
                    } else {
                        fa = Pb(Ea);
                        ga = kb();
                    }
                    xa[0] = Uc(xa[0], ga);
                    xa[2] = Ma;
                    break;
                case 5:
                    if ((Ea >> 6) == 3) {
                        ga = xa[Ea & 7];
                    } else {
                        fa = Pb(Ea);
                        ga = kb();
                    }
                    xa[0] = Vc(xa[0], ga);
                    xa[2] = Ma;
                    break;
                case 6:
                    if ((Ea >> 6) == 3) {
                        ga = xa[Ea & 7];
                    } else {
                        fa = Pb(Ea);
                        ga = kb();
                    }
                    xa[0] = Gc(xa[2], xa[0], ga);
                    xa[2] = Ma;
                    break;
                case 7:
                    if ((Ea >> 6) == 3) {
                        ga = xa[Ea & 7];
                    } else {
                        fa = Pb(Ea);
                        ga = kb();
                    }
                    xa[0] = Kc(xa[2], xa[0], ga);
                    xa[2] = Ma;
                    break;
                default:
                    Cc(6);
                }
                break Ed;
            case 0xc0:
                Ea = Ta[Kb++];;
                Ja = (Ea >> 3) & 7;
                if ((Ea >> 6) == 3) {
                    Ha = Ta[Kb++];;
                    Fa = Ea & 7;
                    Vb(Fa, ic(Ja, (xa[Fa & 3] >> ((Fa & 4) << 1)), Ha));
                } else {
                    fa = Pb(Ea);
                    Ha = Ta[Kb++];;
                    ga = mb();
                    ga = ic(Ja, ga, Ha);
                    sb(ga);
                }
                break Ed;
            case 0xc1:
                Ea = Ta[Kb++];;
                Ja = (Ea >> 3) & 7;
                if ((Ea >> 6) == 3) {
                    Ha = Ta[Kb++];;
                    Fa = Ea & 7;
                    xa[Fa] = mc(Ja, xa[Fa], Ha);
                } else {
                    fa = Pb(Ea);
                    Ha = Ta[Kb++];;
                    ga = qb();
                    ga = mc(Ja, ga, Ha);
                    wb(ga);
                }
                break Ed;
            case 0xd0:
                Ea = Ta[Kb++];;
                Ja = (Ea >> 3) & 7;
                if ((Ea >> 6) == 3) {
                    Fa = Ea & 7;
                    Vb(Fa, ic(Ja, (xa[Fa & 3] >> ((Fa & 4) << 1)), 1));
                } else {
                    fa = Pb(Ea);
                    ga = mb();
                    ga = ic(Ja, ga, 1);
                    sb(ga);
                }
                break Ed;
            case 0xd1:
                Ea = Ta[Kb++];;
                Ja = (Ea >> 3) & 7;
                if ((Ea >> 6) == 3) {
                    Fa = Ea & 7;
                    xa[Fa] = mc(Ja, xa[Fa], 1);
                } else {
                    fa = Pb(Ea);
                    ga = qb();
                    ga = mc(Ja, ga, 1);
                    wb(ga);
                }
                break Ed;
            case 0xd2:
                Ea = Ta[Kb++];;
                Ja = (Ea >> 3) & 7;
                Ha = xa[1] & 0xff;
                if ((Ea >> 6) == 3) {
                    Fa = Ea & 7;
                    Vb(Fa, ic(Ja, (xa[Fa & 3] >> ((Fa & 4) << 1)), Ha));
                } else {
                    fa = Pb(Ea);
                    ga = mb();
                    ga = ic(Ja, ga, Ha);
                    sb(ga);
                }
                break Ed;
            case 0xd3:
                Ea = Ta[Kb++];;
                Ja = (Ea >> 3) & 7;
                Ha = xa[1] & 0xff;
                if ((Ea >> 6) == 3) {
                    Fa = Ea & 7;
                    xa[Fa] = mc(Ja, xa[Fa], Ha);
                } else {
                    fa = Pb(Ea);
                    ga = qb();
                    ga = mc(Ja, ga, Ha);
                    wb(ga);
                }
                break Ed;
            case 0x98:
                xa[0] = (xa[0] << 16) >> 16;
                break Ed;
            case 0x99:
                xa[2] = xa[0] >> 31;
                break Ed;
            case 0x50:
            case 0x51:
            case 0x52:
            case 0x53:
            case 0x54:
            case 0x55:
            case 0x56:
            case 0x57:
                ga = xa[b & 7];
                if (Qa) {
                    fa = (xa[4] - 4) >> 0; {
                        Ua = cb[fa >>> 12];
                        if ((Ua | fa) & 3) {
                            vb(ga);
                        } else {
                            Wa[(fa ^ Ua) >> 2] = ga;
                        }
                    };
                    xa[4] = fa;
                } else {
                    wd(ga);
                }
                break Ed;
            case 0x58:
            case 0x59:
            case 0x5a:
            case 0x5b:
            case 0x5c:
            case 0x5d:
            case 0x5e:
            case 0x5f:
                if (Qa) {
                    fa = xa[4];
                    ga = (((Ua = bb[fa >>> 12]) | fa) & 3 ? jb() : Wa[(fa ^ Ua) >> 2]);
                    xa[4] = (fa + 4) >> 0;
                } else {
                    ga = zd();
                    Ad();
                }
                xa[b & 7] = ga;
                break Ed;
            case 0x60:
                Gf();
                break Ed;
            case 0x61:
                If();
                break Ed;
            case 0x8f:
                Ea = Ta[Kb++];;
                if ((Ea >> 6) == 3) {
                    ga = zd();
                    Ad();
                    xa[Ea & 7] = ga;
                } else {
                    ga = zd();
                    Ha = xa[4];
                    Ad();
                    Ia = xa[4];
                    fa = Pb(Ea);
                    xa[4] = Ha;
                    wb(ga);
                    xa[4] = Ia;
                }
                break Ed;
            case 0x68:
                {
                    ga = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                    Kb += 4;
                };
                if (Qa) {
                    fa = (xa[4] - 4) >> 0;
                    wb(ga);
                    xa[4] = fa;
                } else {
                    wd(ga);
                }
                break Ed;
            case 0x6a:
                ga = ((Ta[Kb++] << 24) >> 24);;
                if (Qa) {
                    fa = (xa[4] - 4) >> 0;
                    wb(ga);
                    xa[4] = fa;
                } else {
                    wd(ga);
                }
                break Ed;
            case 0xc8:
                Pf();
                break Ed;
            case 0xc9:
                if (Qa) {
                    fa = xa[5];
                    ga = kb();
                    xa[5] = ga;
                    xa[4] = (fa + 4) >> 0;
                } else {
                    Kf();
                }
                break Ed;
            case 0x9c:
                Sa = (wa.eflags >> 12) & 3;
                if ((wa.eflags & 0x00020000) && Sa != 3) Cc(13);
                ga = hd() & ~ (0x00020000 | 0x00010000);
                if ((((Da >> 8) & 1) ^ 1)) {
                    wd(ga);
                } else {
                    ud(ga);
                }
                break Ed;
            case 0x9d:
                Sa = (wa.eflags >> 12) & 3;
                if ((wa.eflags & 0x00020000) && Sa != 3) Cc(13);
                if ((((Da >> 8) & 1) ^ 1)) {
                    ga = zd();
                    Ad();
                    Ha = -1;
                } else {
                    ga = xd();
                    yd();
                    Ha = 0xffff;
                }
                Ia = (0x00000100 | 0x00040000 | 0x00200000 | 0x00004000);
                if (wa.cpl == 0) {
                    Ia |= 0x00000200 | 0x00003000;
                } else {
                    if (wa.cpl <= Sa) Ia |= 0x00000200;
                }
                jd(ga, Ia & Ha); {
                    if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                };
                break Ed;
            case 0x06:
            case 0x0e:
            case 0x16:
            case 0x1e:
                wd(wa.segs[b >> 3].selector);
                break Ed;
            case 0x07:
            case 0x17:
            case 0x1f:
                Ge(b >> 3, zd() & 0xffff);
                Ad();
                break Ed;
            case 0x8d:
                Ea = Ta[Kb++];;
                if ((Ea >> 6) == 3) Cc(6);
                Da = (Da & ~0x000f) | (6 + 1);
                xa[(Ea >> 3) & 7] = Pb(Ea);
                break Ed;
            case 0xfe:
                Ea = Ta[Kb++];;
                Ja = (Ea >> 3) & 7;
                switch (Ja) {
                case 0:
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        Vb(Fa, gc((xa[Fa & 3] >> ((Fa & 4) << 1))));
                    } else {
                        fa = Pb(Ea);
                        ga = mb();
                        ga = gc(ga);
                        sb(ga);
                    }
                    break;
                case 1:
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        Vb(Fa, hc((xa[Fa & 3] >> ((Fa & 4) << 1))));
                    } else {
                        fa = Pb(Ea);
                        ga = mb();
                        ga = hc(ga);
                        sb(ga);
                    }
                    break;
                default:
                    Cc(6);
                }
                break Ed;
            case 0xff:
                Ea = Ta[Kb++];;
                Ja = (Ea >> 3) & 7;
                switch (Ja) {
                case 0:
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7; {
                            if (Aa < 25) {
                                Ba = Aa;
                                Ca = za;
                            }
                            xa[Fa] = za = (xa[Fa] + 1) >> 0;
                            Aa = 27;
                        };
                    } else {
                        fa = Pb(Ea);
                        ga = qb(); {
                            if (Aa < 25) {
                                Ba = Aa;
                                Ca = za;
                            }
                            ga = za = (ga + 1) >> 0;
                            Aa = 27;
                        };
                        wb(ga);
                    }
                    break;
                case 1:
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7; {
                            if (Aa < 25) {
                                Ba = Aa;
                                Ca = za;
                            }
                            xa[Fa] = za = (xa[Fa] - 1) >> 0;
                            Aa = 30;
                        };
                    } else {
                        fa = Pb(Ea);
                        ga = qb(); {
                            if (Aa < 25) {
                                Ba = Aa;
                                Ca = za;
                            }
                            ga = za = (ga - 1) >> 0;
                            Aa = 30;
                        };
                        wb(ga);
                    }
                    break;
                case 2:
                    if ((Ea >> 6) == 3) {
                        ga = xa[Ea & 7];
                    } else {
                        fa = Pb(Ea);
                        ga = kb();
                    }
                    Ha = (Jb + Kb - Mb);
                    if (Qa) {
                        fa = (xa[4] - 4) >> 0;
                        wb(Ha);
                        xa[4] = fa;
                    } else {
                        wd(Ha);
                    }
                    Jb = ga,
                    Kb = Mb = 0;
                    break;
                case 4:
                    if ((Ea >> 6) == 3) {
                        ga = xa[Ea & 7];
                    } else {
                        fa = Pb(Ea);
                        ga = kb();
                    }
                    Jb = ga,
                    Kb = Mb = 0;
                    break;
                case 6:
                    if ((Ea >> 6) == 3) {
                        ga = xa[Ea & 7];
                    } else {
                        fa = Pb(Ea);
                        ga = kb();
                    }
                    if (Qa) {
                        fa = (xa[4] - 4) >> 0;
                        wb(ga);
                        xa[4] = fa;
                    } else {
                        wd(ga);
                    }
                    break;
                case 3:
                case 5:
                    if ((Ea >> 6) == 3) Cc(6);
                    fa = Pb(Ea);
                    ga = kb();
                    fa = (fa + 4) >> 0;
                    Ha = ib();
                    if (Ja == 3) Ve(1, Ha, ga, (Jb + Kb - Mb));
                    else Me(Ha, ga);
                    break;
                default:
                    Cc(6);
                }
                break Ed;
            case 0xeb:
                ga = ((Ta[Kb++] << 24) >> 24);;
                Kb = (Kb + ga) >> 0;
                break Ed;
            case 0xe9:
                {
                    ga = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                    Kb += 4;
                };
                Kb = (Kb + ga) >> 0;
                break Ed;
            case 0xea:
                if ((((Da >> 8) & 1) ^ 1)) {
                    {
                        ga = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                        Kb += 4;
                    };
                } else {
                    ga = Ob();
                }
                Ha = Ob();
                Me(Ha, ga);
                break Ed;
            case 0x70:
                if (Yc()) {
                    ga = ((Ta[Kb++] << 24) >> 24);;
                    Kb = (Kb + ga) >> 0;
                } else {
                    Kb = (Kb + 1) >> 0;
                }
                break Ed;
            case 0x71:
                if (!Yc()) {
                    ga = ((Ta[Kb++] << 24) >> 24);;
                    Kb = (Kb + ga) >> 0;
                } else {
                    Kb = (Kb + 1) >> 0;
                }
                break Ed;
            case 0x72:
                if (bc()) {
                    ga = ((Ta[Kb++] << 24) >> 24);;
                    Kb = (Kb + ga) >> 0;
                } else {
                    Kb = (Kb + 1) >> 0;
                }
                break Ed;
            case 0x73:
                if (!bc()) {
                    ga = ((Ta[Kb++] << 24) >> 24);;
                    Kb = (Kb + ga) >> 0;
                } else {
                    Kb = (Kb + 1) >> 0;
                }
                break Ed;
            case 0x74:
                if ((za == 0)) {
                    ga = ((Ta[Kb++] << 24) >> 24);;
                    Kb = (Kb + ga) >> 0;
                } else {
                    Kb = (Kb + 1) >> 0;
                }
                break Ed;
            case 0x75:
                if (! (za == 0)) {
                    ga = ((Ta[Kb++] << 24) >> 24);;
                    Kb = (Kb + ga) >> 0;
                } else {
                    Kb = (Kb + 1) >> 0;
                }
                break Ed;
            case 0x76:
                if (Zc()) {
                    ga = ((Ta[Kb++] << 24) >> 24);;
                    Kb = (Kb + ga) >> 0;
                } else {
                    Kb = (Kb + 1) >> 0;
                }
                break Ed;
            case 0x77:
                if (!Zc()) {
                    ga = ((Ta[Kb++] << 24) >> 24);;
                    Kb = (Kb + ga) >> 0;
                } else {
                    Kb = (Kb + 1) >> 0;
                }
                break Ed;
            case 0x78:
                if ((Aa == 24 ? ((ya >> 7) & 1) : (za < 0))) {
                    ga = ((Ta[Kb++] << 24) >> 24);;
                    Kb = (Kb + ga) >> 0;
                } else {
                    Kb = (Kb + 1) >> 0;
                }
                break Ed;
            case 0x79:
                if (! (Aa == 24 ? ((ya >> 7) & 1) : (za < 0))) {
                    ga = ((Ta[Kb++] << 24) >> 24);;
                    Kb = (Kb + ga) >> 0;
                } else {
                    Kb = (Kb + 1) >> 0;
                }
                break Ed;
            case 0x7a:
                if (ad()) {
                    ga = ((Ta[Kb++] << 24) >> 24);;
                    Kb = (Kb + ga) >> 0;
                } else {
                    Kb = (Kb + 1) >> 0;
                }
                break Ed;
            case 0x7b:
                if (!ad()) {
                    ga = ((Ta[Kb++] << 24) >> 24);;
                    Kb = (Kb + ga) >> 0;
                } else {
                    Kb = (Kb + 1) >> 0;
                }
                break Ed;
            case 0x7c:
                if (bd()) {
                    ga = ((Ta[Kb++] << 24) >> 24);;
                    Kb = (Kb + ga) >> 0;
                } else {
                    Kb = (Kb + 1) >> 0;
                }
                break Ed;
            case 0x7d:
                if (!bd()) {
                    ga = ((Ta[Kb++] << 24) >> 24);;
                    Kb = (Kb + ga) >> 0;
                } else {
                    Kb = (Kb + 1) >> 0;
                }
                break Ed;
            case 0x7e:
                if (cd()) {
                    ga = ((Ta[Kb++] << 24) >> 24);;
                    Kb = (Kb + ga) >> 0;
                } else {
                    Kb = (Kb + 1) >> 0;
                }
                break Ed;
            case 0x7f:
                if (!cd()) {
                    ga = ((Ta[Kb++] << 24) >> 24);;
                    Kb = (Kb + ga) >> 0;
                } else {
                    Kb = (Kb + 1) >> 0;
                }
                break Ed;
            case 0xe0:
            case 0xe1:
            case 0xe2:
                ga = ((Ta[Kb++] << 24) >> 24);;
                if (Da & 0x0080) Ja = 0xffff;
                else Ja = -1;
                Ha = (xa[1] - 1) & Ja;
                xa[1] = (xa[1] & ~Ja) | Ha;
                b &= 3;
                if (b == 0) Ia = !(za == 0);
                else if (b == 1) Ia = (za == 0);
                else Ia = 1;
                if (Ha && Ia) {
                    if (Da & 0x0100) {
                        Jb = (Jb + Kb - Mb + ga) & 0xffff,
                        Kb = Mb = 0;
                    } else {
                        Kb = (Kb + ga) >> 0;
                    }
                }
                break Ed;
            case 0xe3:
                ga = ((Ta[Kb++] << 24) >> 24);;
                if (Da & 0x0080) Ja = 0xffff;
                else Ja = -1;
                if ((xa[1] & Ja) == 0) {
                    if (Da & 0x0100) {
                        Jb = (Jb + Kb - Mb + ga) & 0xffff,
                        Kb = Mb = 0;
                    } else {
                        Kb = (Kb + ga) >> 0;
                    }
                }
                break Ed;
            case 0xc2:
                Ha = (Ob() << 16) >> 16;
                ga = zd();
                xa[4] = (xa[4] & ~Pa) | ((xa[4] + 4 + Ha) & Pa);
                Jb = ga,
                Kb = Mb = 0;
                break Ed;
            case 0xc3:
                if (Qa) {
                    fa = xa[4];
                    ga = kb();
                    xa[4] = (xa[4] + 4) >> 0;
                } else {
                    ga = zd();
                    Ad();
                }
                Jb = ga,
                Kb = Mb = 0;
                break Ed;
            case 0xe8:
                {
                    ga = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                    Kb += 4;
                };
                Ha = (Jb + Kb - Mb);
                if (Qa) {
                    fa = (xa[4] - 4) >> 0;
                    wb(Ha);
                    xa[4] = fa;
                } else {
                    wd(Ha);
                }
                Kb = (Kb + ga) >> 0;
                break Ed;
            case 0x9a:
                Ia = (((Da >> 8) & 1) ^ 1);
                if (Ia) {
                    {
                        ga = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                        Kb += 4;
                    };
                } else {
                    ga = Ob();
                }
                Ha = Ob();
                Ve(Ia, Ha, ga, (Jb + Kb - Mb)); {
                    if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                };
                break Ed;
            case 0xca:
                Ha = (Ob() << 16) >> 16;
                jf((((Da >> 8) & 1) ^ 1), Ha); {
                    if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                };
                break Ed;
            case 0xcb:
                jf((((Da >> 8) & 1) ^ 1), 0); {
                    if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                };
                break Ed;
            case 0xcf:
                hf((((Da >> 8) & 1) ^ 1)); {
                    if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                };
                break Ed;
            case 0x90:
                break Ed;
            case 0xcc:
                Ha = (Jb + Kb - Mb);
                ze(3, 1, 0, Ha, 0);
                break Ed;
            case 0xcd:
                ga = Ta[Kb++];;
                if ((wa.eflags & 0x00020000) && ((wa.eflags >> 12) & 3) != 3) Cc(13);
                Ha = (Jb + Kb - Mb);
                ze(ga, 1, 0, Ha, 0);
                break Ed;
            case 0xce:
                if (Yc()) {
                    Ha = (Jb + Kb - Mb);
                    ze(4, 1, 0, Ha, 0);
                }
                break Ed;
            case 0x62:
                Df();
                break Ed;
            case 0xf5:
                ya = gd() ^ 0x0001;
                za = ((ya >> 6) & 1) ^ 1;
                Aa = 24;
                break Ed;
            case 0xf8:
                ya = gd() & ~0x0001;
                za = ((ya >> 6) & 1) ^ 1;
                Aa = 24;
                break Ed;
            case 0xf9:
                ya = gd() | 0x0001;
                za = ((ya >> 6) & 1) ^ 1;
                Aa = 24;
                break Ed;
            case 0xfc:
                wa.df = 1;
                break Ed;
            case 0xfd:
                wa.df = -1;
                break Ed;
            case 0xfa:
                Sa = (wa.eflags >> 12) & 3;
                if (wa.cpl > Sa) Cc(13);
                wa.eflags &= ~0x00000200;
                break Ed;
            case 0xfb:
                Sa = (wa.eflags >> 12) & 3;
                if (wa.cpl > Sa) Cc(13);
                wa.eflags |= 0x00000200; {
                    if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                };
                break Ed;
            case 0x9e:
                ya = ((xa[0] >> 8) & (0x0080 | 0x0040 | 0x0010 | 0x0004 | 0x0001)) | (Yc() << 11);
                za = ((ya >> 6) & 1) ^ 1;
                Aa = 24;
                break Ed;
            case 0x9f:
                ga = hd();
                Vb(4, ga);
                break Ed;
            case 0xf4:
                if (wa.cpl != 0) Cc(13);
                wa.halted = 1;
                La = 257;
                break yg;
            case 0xa4:
                Zf();
                break Ed;
            case 0xa5:
                sg();
                break Ed;
            case 0xaa:
                bg();
                break Ed;
            case 0xab:
                ug();
                break Ed;
            case 0xa6:
                cg();
                break Ed;
            case 0xa7:
                vg();
                break Ed;
            case 0xac:
                dg();
                break Ed;
            case 0xad:
                wg();
                break Ed;
            case 0xae:
                eg();
                break Ed;
            case 0xaf:
                xg();
                break Ed;
            case 0x6c:
                Sf(); {
                    if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                };
                break Ed;
            case 0x6d:
                mg(); {
                    if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                };
                break Ed;
            case 0x6e:
                Xf(); {
                    if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                };
                break Ed;
            case 0x6f:
                rg(); {
                    if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                };
                break Ed;
            case 0xd8:
            case 0xd9:
            case 0xda:
            case 0xdb:
            case 0xdc:
            case 0xdd:
            case 0xde:
            case 0xdf:
                if (wa.cr0 & ((1 << 2) | (1 << 3))) {
                    Cc(7);
                }
                Ea = Ta[Kb++];;
                Ga = (Ea >> 3) & 7;
                Fa = Ea & 7;
                Ja = ((b & 7) << 3) | ((Ea >> 3) & 7);
                Wb(0, 0xffff);
                if ((Ea >> 6) == 3) {} else {
                    fa = Pb(Ea);
                }
                break Ed;
            case 0x9b:
                break Ed;
            case 0xe4:
                Sa = (wa.eflags >> 12) & 3;
                if (wa.cpl > Sa) Cc(13);
                ga = Ta[Kb++];;
                Vb(0, wa.ld8_port(ga)); {
                    if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                };
                break Ed;
            case 0xe5:
                Sa = (wa.eflags >> 12) & 3;
                if (wa.cpl > Sa) Cc(13);
                ga = Ta[Kb++];;
                xa[0] = wa.ld32_port(ga); {
                    if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                };
                break Ed;
            case 0xe6:
                Sa = (wa.eflags >> 12) & 3;
                if (wa.cpl > Sa) Cc(13);
                ga = Ta[Kb++];;
                wa.st8_port(ga, xa[0] & 0xff); {
                    if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                };
                break Ed;
            case 0xe7:
                Sa = (wa.eflags >> 12) & 3;
                if (wa.cpl > Sa) Cc(13);
                ga = Ta[Kb++];;
                wa.st32_port(ga, xa[0]); {
                    if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                };
                break Ed;
            case 0xec:
                Sa = (wa.eflags >> 12) & 3;
                if (wa.cpl > Sa) Cc(13);
                Vb(0, wa.ld8_port(xa[2] & 0xffff)); {
                    if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                };
                break Ed;
            case 0xed:
                Sa = (wa.eflags >> 12) & 3;
                if (wa.cpl > Sa) Cc(13);
                xa[0] = wa.ld32_port(xa[2] & 0xffff); {
                    if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                };
                break Ed;
            case 0xee:
                Sa = (wa.eflags >> 12) & 3;
                if (wa.cpl > Sa) Cc(13);
                wa.st8_port(xa[2] & 0xffff, xa[0] & 0xff); {
                    if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                };
                break Ed;
            case 0xef:
                Sa = (wa.eflags >> 12) & 3;
                if (wa.cpl > Sa) Cc(13);
                wa.st32_port(xa[2] & 0xffff, xa[0]); {
                    if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                };
                break Ed;
            case 0x27:
                zf();
                break Ed;
            case 0x2f:
                Bf();
                break Ed;
            case 0x37:
                vf();
                break Ed;
            case 0x3f:
                yf();
                break Ed;
            case 0xd4:
                ga = Ta[Kb++];;
                rf(ga);
                break Ed;
            case 0xd5:
                ga = Ta[Kb++];;
                uf(ga);
                break Ed;
            case 0x63:
                pf();
                break Ed;
            case 0xd6:
            case 0xf1:
                Cc(6);
                break;
            case 0x0f:
                b = Ta[Kb++];;
                switch (b) {
                case 0x80:
                case 0x81:
                case 0x82:
                case 0x83:
                case 0x84:
                case 0x85:
                case 0x86:
                case 0x87:
                case 0x88:
                case 0x89:
                case 0x8a:
                case 0x8b:
                case 0x8c:
                case 0x8d:
                case 0x8e:
                case 0x8f:
                    {
                        ga = Ta[Kb] | (Ta[Kb + 1] << 8) | (Ta[Kb + 2] << 16) | (Ta[Kb + 3] << 24);
                        Kb += 4;
                    };
                    if (ed(b & 0xf)) Kb = (Kb + ga) >> 0;
                    break Ed;
                case 0x90:
                case 0x91:
                case 0x92:
                case 0x93:
                case 0x94:
                case 0x95:
                case 0x96:
                case 0x97:
                case 0x98:
                case 0x99:
                case 0x9a:
                case 0x9b:
                case 0x9c:
                case 0x9d:
                case 0x9e:
                case 0x9f:
                    Ea = Ta[Kb++];;
                    ga = ed(b & 0xf);
                    if ((Ea >> 6) == 3) {
                        Vb(Ea & 7, ga);
                    } else {
                        fa = Pb(Ea);
                        sb(ga);
                    }
                    break Ed;
                case 0x40:
                case 0x41:
                case 0x42:
                case 0x43:
                case 0x44:
                case 0x45:
                case 0x46:
                case 0x47:
                case 0x48:
                case 0x49:
                case 0x4a:
                case 0x4b:
                case 0x4c:
                case 0x4d:
                case 0x4e:
                case 0x4f:
                    Ea = Ta[Kb++];;
                    if ((Ea >> 6) == 3) {
                        ga = xa[Ea & 7];
                    } else {
                        fa = Pb(Ea);
                        ga = kb();
                    }
                    if (ed(b & 0xf)) xa[(Ea >> 3) & 7] = ga;
                    break Ed;
                case 0xb6:
                    Ea = Ta[Kb++];;
                    Ga = (Ea >> 3) & 7;
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        ga = (xa[Fa & 3] >> ((Fa & 4) << 1)) & 0xff;
                    } else {
                        fa = Pb(Ea);
                        ga = (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
                    }
                    xa[Ga] = ga;
                    break Ed;
                case 0xb7:
                    Ea = Ta[Kb++];;
                    Ga = (Ea >> 3) & 7;
                    if ((Ea >> 6) == 3) {
                        ga = xa[Ea & 7] & 0xffff;
                    } else {
                        fa = Pb(Ea);
                        ga = ib();
                    }
                    xa[Ga] = ga;
                    break Ed;
                case 0xbe:
                    Ea = Ta[Kb++];;
                    Ga = (Ea >> 3) & 7;
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        ga = (xa[Fa & 3] >> ((Fa & 4) << 1));
                    } else {
                        fa = Pb(Ea);
                        ga = (((Ua = bb[fa >>> 12]) == -1) ? db() : Ta[fa ^ Ua]);
                    }
                    xa[Ga] = (((ga) << 24) >> 24);
                    break Ed;
                case 0xbf:
                    Ea = Ta[Kb++];;
                    Ga = (Ea >> 3) & 7;
                    if ((Ea >> 6) == 3) {
                        ga = xa[Ea & 7];
                    } else {
                        fa = Pb(Ea);
                        ga = ib();
                    }
                    xa[Ga] = (((ga) << 16) >> 16);
                    break Ed;
                case 0x00:
                    if (! (wa.cr0 & (1 << 0)) || (wa.eflags & 0x00020000)) Cc(6);
                    Ea = Ta[Kb++];;
                    Ja = (Ea >> 3) & 7;
                    switch (Ja) {
                    case 0:
                    case 1:
                        if (Ja == 0) ga = wa.ldt.selector;
                        else ga = wa.tr.selector;
                        if ((Ea >> 6) == 3) {
                            Wb(Ea & 7, ga);
                        } else {
                            fa = Pb(Ea);
                            ub(ga);
                        }
                        break;
                    case 2:
                    case 3:
                        if (wa.cpl != 0) Cc(13);
                        if ((Ea >> 6) == 3) {
                            ga = xa[Ea & 7] & 0xffff;
                        } else {
                            fa = Pb(Ea);
                            ga = ib();
                        }
                        if (Ja == 2) Ae(ga);
                        else Ce(ga);
                        break;
                    case 4:
                    case 5:
                        if ((Ea >> 6) == 3) {
                            ga = xa[Ea & 7] & 0xffff;
                        } else {
                            fa = Pb(Ea);
                            ga = ib();
                        }
                        of(ga, Ja & 1);
                        break;
                    default:
                        Cc(6);
                    }
                    break Ed;
                case 0x01:
                    Ea = Ta[Kb++];;
                    Ja = (Ea >> 3) & 7;
                    switch (Ja) {
                    case 2:
                    case 3:
                        if ((Ea >> 6) == 3) Cc(6);
                        if (this.cpl != 0) Cc(13);
                        fa = Pb(Ea);
                        ga = ib();
                        fa += 2;
                        Ha = kb();
                        if (Ja == 2) {
                            this.gdt.base = Ha;
                            this.gdt.limit = ga;
                        } else {
                            this.idt.base = Ha;
                            this.idt.limit = ga;
                        }
                        break;
                    case 7:
                        if (this.cpl != 0) Cc(13);
                        if ((Ea >> 6) == 3) Cc(6);
                        fa = Pb(Ea);
                        wa.tlb_flush_page(fa & -4096);
                        break;
                    default:
                        Cc(6);
                    }
                    break Ed;
                case 0x02:
                case 0x03:
                    mf((((Da >> 8) & 1) ^ 1), b & 1);
                    break Ed;
                case 0x20:
                    if (wa.cpl != 0) Cc(13);
                    Ea = Ta[Kb++];;
                    if ((Ea >> 6) != 3) Cc(6);
                    Ga = (Ea >> 3) & 7;
                    switch (Ga) {
                    case 0:
                        ga = wa.cr0;
                        break;
                    case 2:
                        ga = wa.cr2;
                        break;
                    case 3:
                        ga = wa.cr3;
                        break;
                    case 4:
                        ga = wa.cr4;
                        break;
                    default:
                        Cc(6);
                    }
                    xa[Ea & 7] = ga;
                    break Ed;
                case 0x22:
                    if (wa.cpl != 0) Cc(13);
                    Ea = Ta[Kb++];;
                    if ((Ea >> 6) != 3) Cc(6);
                    Ga = (Ea >> 3) & 7;
                    ga = xa[Ea & 7];
                    switch (Ga) {
                    case 0:
                        Od(ga);
                        break;
                    case 2:
                        wa.cr2 = ga;
                        break;
                    case 3:
                        Qd(ga);
                        break;
                    case 4:
                        Sd(ga);
                        break;
                    default:
                        Cc(6);
                    }
                    break Ed;
                case 0x06:
                    if (wa.cpl != 0) Cc(13);
                    Od(wa.cr0 & ~ (1 << 3));
                    break Ed;
                case 0x23:
                    if (wa.cpl != 0) Cc(13);
                    Ea = Ta[Kb++];;
                    if ((Ea >> 6) != 3) Cc(6);
                    Ga = (Ea >> 3) & 7;
                    ga = xa[Ea & 7];
                    if (Ga == 4 || Ga == 5) Cc(6);
                    break Ed;
                case 0xb2:
                case 0xb4:
                case 0xb5:
                    Qf(b & 7);
                    break Ed;
                case 0xa2:
                    qf();
                    break Ed;
                case 0xa4:
                    Ea = Ta[Kb++];;
                    Ha = xa[(Ea >> 3) & 7];
                    if ((Ea >> 6) == 3) {
                        Ia = Ta[Kb++];;
                        Fa = Ea & 7;
                        xa[Fa] = qc(xa[Fa], Ha, Ia);
                    } else {
                        fa = Pb(Ea);
                        Ia = Ta[Kb++];;
                        ga = qb();
                        ga = qc(ga, Ha, Ia);
                        wb(ga);
                    }
                    break Ed;
                case 0xa5:
                    Ea = Ta[Kb++];;
                    Ha = xa[(Ea >> 3) & 7];
                    Ia = xa[1];
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        xa[Fa] = qc(xa[Fa], Ha, Ia);
                    } else {
                        fa = Pb(Ea);
                        ga = qb();
                        ga = qc(ga, Ha, Ia);
                        wb(ga);
                    }
                    break Ed;
                case 0xac:
                    Ea = Ta[Kb++];;
                    Ha = xa[(Ea >> 3) & 7];
                    if ((Ea >> 6) == 3) {
                        Ia = Ta[Kb++];;
                        Fa = Ea & 7;
                        xa[Fa] = rc(xa[Fa], Ha, Ia);
                    } else {
                        fa = Pb(Ea);
                        Ia = Ta[Kb++];;
                        ga = qb();
                        ga = rc(ga, Ha, Ia);
                        wb(ga);
                    }
                    break Ed;
                case 0xad:
                    Ea = Ta[Kb++];;
                    Ha = xa[(Ea >> 3) & 7];
                    Ia = xa[1];
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        xa[Fa] = rc(xa[Fa], Ha, Ia);
                    } else {
                        fa = Pb(Ea);
                        ga = qb();
                        ga = rc(ga, Ha, Ia);
                        wb(ga);
                    }
                    break Ed;
                case 0xba:
                    Ea = Ta[Kb++];;
                    Ja = (Ea >> 3) & 7;
                    switch (Ja) {
                    case 4:
                        if ((Ea >> 6) == 3) {
                            ga = xa[Ea & 7];
                            Ha = Ta[Kb++];;
                        } else {
                            fa = Pb(Ea);
                            Ha = Ta[Kb++];;
                            ga = kb();
                        }
                        tc(ga, Ha);
                        break;
                    case 5:
                    case 6:
                    case 7:
                        if ((Ea >> 6) == 3) {
                            Fa = Ea & 7;
                            Ha = Ta[Kb++];;
                            xa[Fa] = wc(Ja & 3, xa[Fa], Ha);
                        } else {
                            fa = Pb(Ea);
                            Ha = Ta[Kb++];;
                            ga = qb();
                            ga = wc(Ja & 3, ga, Ha);
                            wb(ga);
                        }
                        break;
                    default:
                        Cc(6);
                    }
                    break Ed;
                case 0xa3:
                    Ea = Ta[Kb++];;
                    Ha = xa[(Ea >> 3) & 7];
                    if ((Ea >> 6) == 3) {
                        ga = xa[Ea & 7];
                    } else {
                        fa = Pb(Ea);
                        fa = (fa + ((Ha >> 5) << 2)) >> 0;
                        ga = kb();
                    }
                    tc(ga, Ha);
                    break Ed;
                case 0xab:
                case 0xb3:
                case 0xbb:
                    Ea = Ta[Kb++];;
                    Ha = xa[(Ea >> 3) & 7];
                    Ja = (b >> 3) & 3;
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        xa[Fa] = wc(Ja, xa[Fa], Ha);
                    } else {
                        fa = Pb(Ea);
                        fa = (fa + ((Ha >> 5) << 2)) >> 0;
                        ga = qb();
                        ga = wc(Ja, ga, Ha);
                        wb(ga);
                    }
                    break Ed;
                case 0xbc:
                case 0xbd:
                    Ea = Ta[Kb++];;
                    Ga = (Ea >> 3) & 7;
                    if ((Ea >> 6) == 3) {
                        Ha = xa[Ea & 7];
                    } else {
                        fa = Pb(Ea);
                        Ha = kb();
                    }
                    if (b & 1) xa[Ga] = Ac(xa[Ga], Ha);
                    else xa[Ga] = yc(xa[Ga], Ha);
                    break Ed;
                case 0xaf:
                    Ea = Ta[Kb++];;
                    Ga = (Ea >> 3) & 7;
                    if ((Ea >> 6) == 3) {
                        Ha = xa[Ea & 7];
                    } else {
                        fa = Pb(Ea);
                        Ha = kb();
                    }
                    xa[Ga] = Vc(xa[Ga], Ha);
                    break Ed;
                case 0x31:
                    if ((wa.cr4 & (1 << 2)) && wa.cpl != 0) Cc(13);
                    ga = ld();
                    xa[0] = ga >>> 0;
                    xa[2] = (ga / 0x100000000) >>> 0;
                    break Ed;
                case 0xc0:
                    Ea = Ta[Kb++];;
                    Ga = (Ea >> 3) & 7;
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        ga = (xa[Fa & 3] >> ((Fa & 4) << 1));
                        Ha = fc(0, ga, (xa[Ga & 3] >> ((Ga & 4) << 1)));
                        Vb(Ga, ga);
                        Vb(Fa, Ha);
                    } else {
                        fa = Pb(Ea);
                        ga = mb();
                        Ha = fc(0, ga, (xa[Ga & 3] >> ((Ga & 4) << 1)));
                        sb(Ha);
                        Vb(Ga, ga);
                    }
                    break Ed;
                case 0xc1:
                    Ea = Ta[Kb++];;
                    Ga = (Ea >> 3) & 7;
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        ga = xa[Fa];
                        Ha = Xb(0, ga, xa[Ga]);
                        xa[Ga] = ga;
                        xa[Fa] = Ha;
                    } else {
                        fa = Pb(Ea);
                        ga = qb();
                        Ha = Xb(0, ga, xa[Ga]);
                        wb(Ha);
                        xa[Ga] = ga;
                    }
                    break Ed;
                case 0xb0:
                    Ea = Ta[Kb++];;
                    Ga = (Ea >> 3) & 7;
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        ga = (xa[Fa & 3] >> ((Fa & 4) << 1));
                        Ha = fc(5, xa[0], ga);
                        if (Ha == 0) {
                            Vb(Fa, (xa[Ga & 3] >> ((Ga & 4) << 1)));
                        } else {
                            Vb(0, ga);
                        }
                    } else {
                        fa = Pb(Ea);
                        ga = mb();
                        Ha = fc(5, xa[0], ga);
                        if (Ha == 0) {
                            sb((xa[Ga & 3] >> ((Ga & 4) << 1)));
                        } else {
                            Vb(0, ga);
                        }
                    }
                    break Ed;
                case 0xb1:
                    Ea = Ta[Kb++];;
                    Ga = (Ea >> 3) & 7;
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        ga = xa[Fa];
                        Ha = Xb(5, xa[0], ga);
                        if (Ha == 0) {
                            xa[Fa] = xa[Ga];
                        } else {
                            xa[0] = ga;
                        }
                    } else {
                        fa = Pb(Ea);
                        ga = qb();
                        Ha = Xb(5, xa[0], ga);
                        if (Ha == 0) {
                            wb(xa[Ga]);
                        } else {
                            xa[0] = ga;
                        }
                    }
                    break Ed;
                case 0xa0:
                case 0xa8:
                    wd(wa.segs[(b >> 3) & 7].selector);
                    break Ed;
                case 0xa1:
                case 0xa9:
                    Ge((b >> 3) & 7, zd() & 0xffff);
                    Ad();
                    break Ed;
                case 0xc8:
                case 0xc9:
                case 0xca:
                case 0xcb:
                case 0xcc:
                case 0xcd:
                case 0xce:
                case 0xcf:
                    Ga = b & 7;
                    ga = xa[Ga];
                    ga = (ga >>> 24) | ((ga >> 8) & 0x0000ff00) | ((ga << 8) & 0x00ff0000) | (ga << 24);
                    xa[Ga] = ga;
                    break Ed;
                case 0x04:
                case 0x05:
                case 0x07:
                case 0x08:
                case 0x09:
                case 0x0a:
                case 0x0b:
                case 0x0c:
                case 0x0d:
                case 0x0e:
                case 0x0f:
                case 0x10:
                case 0x11:
                case 0x12:
                case 0x13:
                case 0x14:
                case 0x15:
                case 0x16:
                case 0x17:
                case 0x18:
                case 0x19:
                case 0x1a:
                case 0x1b:
                case 0x1c:
                case 0x1d:
                case 0x1e:
                case 0x1f:
                case 0x21:
                case 0x24:
                case 0x25:
                case 0x26:
                case 0x27:
                case 0x28:
                case 0x29:
                case 0x2a:
                case 0x2b:
                case 0x2c:
                case 0x2d:
                case 0x2e:
                case 0x2f:
                case 0x30:
                case 0x32:
                case 0x33:
                case 0x34:
                case 0x35:
                case 0x36:
                case 0x37:
                case 0x38:
                case 0x39:
                case 0x3a:
                case 0x3b:
                case 0x3c:
                case 0x3d:
                case 0x3e:
                case 0x3f:
                case 0x50:
                case 0x51:
                case 0x52:
                case 0x53:
                case 0x54:
                case 0x55:
                case 0x56:
                case 0x57:
                case 0x58:
                case 0x59:
                case 0x5a:
                case 0x5b:
                case 0x5c:
                case 0x5d:
                case 0x5e:
                case 0x5f:
                case 0x60:
                case 0x61:
                case 0x62:
                case 0x63:
                case 0x64:
                case 0x65:
                case 0x66:
                case 0x67:
                case 0x68:
                case 0x69:
                case 0x6a:
                case 0x6b:
                case 0x6c:
                case 0x6d:
                case 0x6e:
                case 0x6f:
                case 0x70:
                case 0x71:
                case 0x72:
                case 0x73:
                case 0x74:
                case 0x75:
                case 0x76:
                case 0x77:
                case 0x78:
                case 0x79:
                case 0x7a:
                case 0x7b:
                case 0x7c:
                case 0x7d:
                case 0x7e:
                case 0x7f:
                case 0xa6:
                case 0xa7:
                case 0xaa:
                case 0xae:
                case 0xb8:
                case 0xb9:
                case 0xc2:
                case 0xc3:
                case 0xc4:
                case 0xc5:
                case 0xc6:
                case 0xc7:
                case 0xd0:
                case 0xd1:
                case 0xd2:
                case 0xd3:
                case 0xd4:
                case 0xd5:
                case 0xd6:
                case 0xd7:
                case 0xd8:
                case 0xd9:
                case 0xda:
                case 0xdb:
                case 0xdc:
                case 0xdd:
                case 0xde:
                case 0xdf:
                case 0xe0:
                case 0xe1:
                case 0xe2:
                case 0xe3:
                case 0xe4:
                case 0xe5:
                case 0xe6:
                case 0xe7:
                case 0xe8:
                case 0xe9:
                case 0xea:
                case 0xeb:
                case 0xec:
                case 0xed:
                case 0xee:
                case 0xef:
                case 0xf0:
                case 0xf1:
                case 0xf2:
                case 0xf3:
                case 0xf4:
                case 0xf5:
                case 0xf6:
                case 0xf7:
                case 0xf8:
                case 0xf9:
                case 0xfa:
                case 0xfb:
                case 0xfc:
                case 0xfd:
                case 0xfe:
                case 0xff:
                default:
                    Cc(6);
                }
                break;
            default:
                switch (b) {
                case 0x189:
                    Ea = Ta[Kb++];;
                    ga = xa[(Ea >> 3) & 7];
                    if ((Ea >> 6) == 3) {
                        Wb(Ea & 7, ga);
                    } else {
                        fa = Pb(Ea);
                        ub(ga);
                    }
                    break Ed;
                case 0x18b:
                    Ea = Ta[Kb++];;
                    if ((Ea >> 6) == 3) {
                        ga = xa[Ea & 7];
                    } else {
                        fa = Pb(Ea);
                        ga = ib();
                    }
                    Wb((Ea >> 3) & 7, ga);
                    break Ed;
                case 0x1b8:
                case 0x1b9:
                case 0x1ba:
                case 0x1bb:
                case 0x1bc:
                case 0x1bd:
                case 0x1be:
                case 0x1bf:
                    Wb(b & 7, Ob());
                    break Ed;
                case 0x1a1:
                    fa = Ub();
                    ga = ib();
                    Wb(0, ga);
                    break Ed;
                case 0x1a3:
                    fa = Ub();
                    ub(xa[0]);
                    break Ed;
                case 0x1c7:
                    Ea = Ta[Kb++];;
                    if ((Ea >> 6) == 3) {
                        ga = Ob();
                        Wb(Ea & 7, ga);
                    } else {
                        fa = Pb(Ea);
                        ga = Ob();
                        ub(ga);
                    }
                    break Ed;
                case 0x191:
                case 0x192:
                case 0x193:
                case 0x194:
                case 0x195:
                case 0x196:
                case 0x197:
                    Ga = b & 7;
                    ga = xa[0];
                    Wb(0, xa[Ga]);
                    Wb(Ga, ga);
                    break Ed;
                case 0x187:
                    Ea = Ta[Kb++];;
                    Ga = (Ea >> 3) & 7;
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        ga = xa[Fa];
                        Wb(Fa, xa[Ga]);
                    } else {
                        fa = Pb(Ea);
                        ga = ob();
                        ub(xa[Ga]);
                    }
                    Wb(Ga, ga);
                    break Ed;
                case 0x1c4:
                    Rf(0);
                    break Ed;
                case 0x1c5:
                    Rf(3);
                    break Ed;
                case 0x101:
                case 0x109:
                case 0x111:
                case 0x119:
                case 0x121:
                case 0x129:
                case 0x131:
                case 0x139:
                    Ea = Ta[Kb++];;
                    Ja = (b >> 3) & 7;
                    Ha = xa[(Ea >> 3) & 7];
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        Wb(Fa, cc(Ja, xa[Fa], Ha));
                    } else {
                        fa = Pb(Ea);
                        if (Ja != 7) {
                            ga = ob();
                            ga = cc(Ja, ga, Ha);
                            ub(ga);
                        } else {
                            ga = ib();
                            cc(7, ga, Ha);
                        }
                    }
                    break Ed;
                case 0x103:
                case 0x10b:
                case 0x113:
                case 0x11b:
                case 0x123:
                case 0x12b:
                case 0x133:
                case 0x13b:
                    Ea = Ta[Kb++];;
                    Ja = (b >> 3) & 7;
                    Ga = (Ea >> 3) & 7;
                    if ((Ea >> 6) == 3) {
                        Ha = xa[Ea & 7];
                    } else {
                        fa = Pb(Ea);
                        Ha = ib();
                    }
                    Wb(Ga, cc(Ja, xa[Ga], Ha));
                    break Ed;
                case 0x105:
                case 0x10d:
                case 0x115:
                case 0x11d:
                case 0x125:
                case 0x12d:
                case 0x135:
                case 0x13d:
                    Ha = Ob();
                    Ja = (b >> 3) & 7;
                    Wb(0, cc(Ja, xa[0], Ha));
                    break Ed;
                case 0x181:
                    Ea = Ta[Kb++];;
                    Ja = (Ea >> 3) & 7;
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        Ha = Ob();
                        xa[Fa] = cc(Ja, xa[Fa], Ha);
                    } else {
                        fa = Pb(Ea);
                        Ha = Ob();
                        if (Ja != 7) {
                            ga = ob();
                            ga = cc(Ja, ga, Ha);
                            ub(ga);
                        } else {
                            ga = ib();
                            cc(7, ga, Ha);
                        }
                    }
                    break Ed;
                case 0x183:
                    Ea = Ta[Kb++];;
                    Ja = (Ea >> 3) & 7;
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        Ha = ((Ta[Kb++] << 24) >> 24);;
                        Wb(Fa, cc(Ja, xa[Fa], Ha));
                    } else {
                        fa = Pb(Ea);
                        Ha = ((Ta[Kb++] << 24) >> 24);;
                        if (Ja != 7) {
                            ga = ob();
                            ga = cc(Ja, ga, Ha);
                            ub(ga);
                        } else {
                            ga = ib();
                            cc(7, ga, Ha);
                        }
                    }
                    break Ed;
                case 0x140:
                case 0x141:
                case 0x142:
                case 0x143:
                case 0x144:
                case 0x145:
                case 0x146:
                case 0x147:
                    Ga = b & 7;
                    Wb(Ga, dc(xa[Ga]));
                    break Ed;
                case 0x148:
                case 0x149:
                case 0x14a:
                case 0x14b:
                case 0x14c:
                case 0x14d:
                case 0x14e:
                case 0x14f:
                    Ga = b & 7;
                    Wb(Ga, ec(xa[Ga]));
                    break Ed;
                case 0x16b:
                    Ea = Ta[Kb++];;
                    Ga = (Ea >> 3) & 7;
                    if ((Ea >> 6) == 3) {
                        Ha = xa[Ea & 7];
                    } else {
                        fa = Pb(Ea);
                        Ha = ib();
                    }
                    Ia = ((Ta[Kb++] << 24) >> 24);;
                    Wb(Ga, Qc(Ha, Ia));
                    break Ed;
                case 0x169:
                    Ea = Ta[Kb++];;
                    Ga = (Ea >> 3) & 7;
                    if ((Ea >> 6) == 3) {
                        Ha = xa[Ea & 7];
                    } else {
                        fa = Pb(Ea);
                        Ha = ib();
                    }
                    Ia = Ob();
                    Wb(Ga, Qc(Ha, Ia));
                    break Ed;
                case 0x185:
                    Ea = Ta[Kb++];;
                    if ((Ea >> 6) == 3) {
                        ga = xa[Ea & 7];
                    } else {
                        fa = Pb(Ea);
                        ga = ib();
                    }
                    Ha = xa[(Ea >> 3) & 7]; {
                        za = (((ga & Ha) << 16) >> 16);
                        Aa = 13;
                    };
                    break Ed;
                case 0x1a9:
                    Ha = Ob(); {
                        za = (((xa[0] & Ha) << 16) >> 16);
                        Aa = 13;
                    };
                    break Ed;
                case 0x1f7:
                    Ea = Ta[Kb++];;
                    Ja = (Ea >> 3) & 7;
                    switch (Ja) {
                    case 0:
                        if ((Ea >> 6) == 3) {
                            ga = xa[Ea & 7];
                        } else {
                            fa = Pb(Ea);
                            ga = ib();
                        }
                        Ha = Ob(); {
                            za = (((ga & Ha) << 16) >> 16);
                            Aa = 13;
                        };
                        break;
                    case 2:
                        if ((Ea >> 6) == 3) {
                            Fa = Ea & 7;
                            Wb(Fa, ~xa[Fa]);
                        } else {
                            fa = Pb(Ea);
                            ga = ob();
                            ga = ~ga;
                            ub(ga);
                        }
                        break;
                    case 3:
                        if ((Ea >> 6) == 3) {
                            Fa = Ea & 7;
                            Wb(Fa, cc(5, 0, xa[Fa]));
                        } else {
                            fa = Pb(Ea);
                            ga = ob();
                            ga = cc(5, 0, ga);
                            ub(ga);
                        }
                        break;
                    case 4:
                        if ((Ea >> 6) == 3) {
                            ga = xa[Ea & 7];
                        } else {
                            fa = Pb(Ea);
                            ga = ib();
                        }
                        ga = Pc(xa[0], ga);
                        Wb(0, ga);
                        Wb(2, ga >> 16);
                        break;
                    case 5:
                        if ((Ea >> 6) == 3) {
                            ga = xa[Ea & 7];
                        } else {
                            fa = Pb(Ea);
                            ga = ib();
                        }
                        ga = Qc(xa[0], ga);
                        Wb(0, ga);
                        Wb(2, ga >> 16);
                        break;
                    case 6:
                        if ((Ea >> 6) == 3) {
                            ga = xa[Ea & 7];
                        } else {
                            fa = Pb(Ea);
                            ga = ib();
                        }
                        Ec(ga);
                        break;
                    case 7:
                        if ((Ea >> 6) == 3) {
                            ga = xa[Ea & 7];
                        } else {
                            fa = Pb(Ea);
                            ga = ib();
                        }
                        Fc(ga);
                        break;
                    default:
                        Cc(6);
                    }
                    break Ed;
                case 0x1c1:
                    Ea = Ta[Kb++];;
                    Ja = (Ea >> 3) & 7;
                    if ((Ea >> 6) == 3) {
                        Ha = Ta[Kb++];;
                        Fa = Ea & 7;
                        Wb(Fa, lc(Ja, xa[Fa], Ha));
                    } else {
                        fa = Pb(Ea);
                        Ha = Ta[Kb++];;
                        ga = ob();
                        ga = lc(Ja, ga, Ha);
                        ub(ga);
                    }
                    break Ed;
                case 0x1d1:
                    Ea = Ta[Kb++];;
                    Ja = (Ea >> 3) & 7;
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        Wb(Fa, lc(Ja, xa[Fa], 1));
                    } else {
                        fa = Pb(Ea);
                        ga = ob();
                        ga = lc(Ja, ga, 1);
                        ub(ga);
                    }
                    break Ed;
                case 0x1d3:
                    Ea = Ta[Kb++];;
                    Ja = (Ea >> 3) & 7;
                    Ha = xa[1] & 0xff;
                    if ((Ea >> 6) == 3) {
                        Fa = Ea & 7;
                        Wb(Fa, lc(Ja, xa[Fa], Ha));
                    } else {
                        fa = Pb(Ea);
                        ga = ob();
                        ga = lc(Ja, ga, Ha);
                        ub(ga);
                    }
                    break Ed;
                case 0x198:
                    Wb(0, (xa[0] << 24) >> 24);
                    break Ed;
                case 0x199:
                    Wb(2, (xa[0] << 16) >> 31);
                    break Ed;
                case 0x190:
                    break Ed;
                case 0x150:
                case 0x151:
                case 0x152:
                case 0x153:
                case 0x154:
                case 0x155:
                case 0x156:
                case 0x157:
                    ud(xa[b & 7]);
                    break Ed;
                case 0x158:
                case 0x159:
                case 0x15a:
                case 0x15b:
                case 0x15c:
                case 0x15d:
                case 0x15e:
                case 0x15f:
                    ga = xd();
                    yd();
                    Wb(b & 7, ga);
                    break Ed;
                case 0x160:
                    Ff();
                    break Ed;
                case 0x161:
                    Hf();
                    break Ed;
                case 0x18f:
                    Ea = Ta[Kb++];;
                    if ((Ea >> 6) == 3) {
                        ga = xd();
                        yd();
                        Wb(Ea & 7, ga);
                    } else {
                        ga = xd();
                        Ha = xa[4];
                        yd();
                        Ia = xa[4];
                        fa = Pb(Ea);
                        xa[4] = Ha;
                        ub(ga);
                        xa[4] = Ia;
                    }
                    break Ed;
                case 0x168:
                    ga = Ob();
                    ud(ga);
                    break Ed;
                case 0x16a:
                    ga = ((Ta[Kb++] << 24) >> 24);;
                    ud(ga);
                    break Ed;
                case 0x1c8:
                    Lf();
                    break Ed;
                case 0x1c9:
                    Jf();
                    break Ed;
                case 0x106:
                case 0x10e:
                case 0x116:
                case 0x11e:
                    ud(wa.segs[(b >> 3) & 3].selector);
                    break Ed;
                case 0x107:
                case 0x117:
                case 0x11f:
                    Ge((b >> 3) & 3, xd());
                    yd();
                    break Ed;
                case 0x18d:
                    Ea = Ta[Kb++];;
                    if ((Ea >> 6) == 3) Cc(6);
                    Da = (Da & ~0x000f) | (6 + 1);
                    Wb((Ea >> 3) & 7, Pb(Ea));
                    break Ed;
                case 0x1ff:
                    Ea = Ta[Kb++];;
                    Ja = (Ea >> 3) & 7;
                    switch (Ja) {
                    case 0:
                        if ((Ea >> 6) == 3) {
                            Fa = Ea & 7;
                            Wb(Fa, dc(xa[Fa]));
                        } else {
                            fa = Pb(Ea);
                            ga = ob();
                            ga = dc(ga);
                            ub(ga);
                        }
                        break;
                    case 1:
                        if ((Ea >> 6) == 3) {
                            Fa = Ea & 7;
                            Wb(Fa, ec(xa[Fa]));
                        } else {
                            fa = Pb(Ea);
                            ga = ob();
                            ga = ec(ga);
                            ub(ga);
                        }
                        break;
                    case 2:
                        if ((Ea >> 6) == 3) {
                            ga = xa[Ea & 7] & 0xffff;
                        } else {
                            fa = Pb(Ea);
                            ga = ib();
                        }
                        ud((Jb + Kb - Mb));
                        Jb = ga,
                        Kb = Mb = 0;
                        break;
                    case 4:
                        if ((Ea >> 6) == 3) {
                            ga = xa[Ea & 7] & 0xffff;
                        } else {
                            fa = Pb(Ea);
                            ga = ib();
                        }
                        Jb = ga,
                        Kb = Mb = 0;
                        break;
                    case 6:
                        if ((Ea >> 6) == 3) {
                            ga = xa[Ea & 7];
                        } else {
                            fa = Pb(Ea);
                            ga = ib();
                        }
                        ud(ga);
                        break;
                    case 3:
                    case 5:
                        if ((Ea >> 6) == 3) Cc(6);
                        fa = Pb(Ea);
                        ga = ib();
                        fa = (fa + 2) >> 0;
                        Ha = ib();
                        if (Ja == 3) Ve(0, Ha, ga, (Jb + Kb - Mb));
                        else Me(Ha, ga);
                        break;
                    default:
                        Cc(6);
                    }
                    break Ed;
                case 0x1eb:
                    ga = ((Ta[Kb++] << 24) >> 24);;
                    Jb = (Jb + Kb - Mb + ga) & 0xffff,
                    Kb = Mb = 0;
                    break Ed;
                case 0x1e9:
                    ga = Ob();
                    Jb = (Jb + Kb - Mb + ga) & 0xffff,
                    Kb = Mb = 0;
                    break Ed;
                case 0x170:
                case 0x171:
                case 0x172:
                case 0x173:
                case 0x174:
                case 0x175:
                case 0x176:
                case 0x177:
                case 0x178:
                case 0x179:
                case 0x17a:
                case 0x17b:
                case 0x17c:
                case 0x17d:
                case 0x17e:
                case 0x17f:
                    ga = ((Ta[Kb++] << 24) >> 24);;
                    Ha = ed(b & 0xf);
                    if (Ha) Jb = (Jb + Kb - Mb + ga) & 0xffff,
                    Kb = Mb = 0;
                    break Ed;
                case 0x1c2:
                    Ha = (Ob() << 16) >> 16;
                    ga = xd();
                    xa[4] = (xa[4] & ~Pa) | ((xa[4] + 2 + Ha) & Pa);
                    Jb = ga,
                    Kb = Mb = 0;
                    break Ed;
                case 0x1c3:
                    ga = xd();
                    yd();
                    Jb = ga,
                    Kb = Mb = 0;
                    break Ed;
                case 0x1e8:
                    ga = Ob();
                    ud((Jb + Kb - Mb));
                    Jb = (Jb + Kb - Mb + ga) & 0xffff,
                    Kb = Mb = 0;
                    break Ed;
                case 0x162:
                    Ef();
                    break Ed;
                case 0x1a5:
                    hg();
                    break Ed;
                case 0x1a7:
                    jg();
                    break Ed;
                case 0x1ad:
                    kg();
                    break Ed;
                case 0x1af:
                    lg();
                    break Ed;
                case 0x1ab:
                    ig();
                    break Ed;
                case 0x16d:
                    fg(); {
                        if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                    };
                    break Ed;
                case 0x16f:
                    gg(); {
                        if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                    };
                    break Ed;
                case 0x1e5:
                    Sa = (wa.eflags >> 12) & 3;
                    if (wa.cpl > Sa) Cc(13);
                    ga = Ta[Kb++];;
                    Wb(0, wa.ld16_port(ga)); {
                        if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                    };
                    break Ed;
                case 0x1e7:
                    Sa = (wa.eflags >> 12) & 3;
                    if (wa.cpl > Sa) Cc(13);
                    ga = Ta[Kb++];;
                    wa.st16_port(ga, xa[0] & 0xffff); {
                        if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                    };
                    break Ed;
                case 0x1ed:
                    Sa = (wa.eflags >> 12) & 3;
                    if (wa.cpl > Sa) Cc(13);
                    Wb(0, wa.ld16_port(xa[2] & 0xffff)); {
                        if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                    };
                    break Ed;
                case 0x1ef:
                    Sa = (wa.eflags >> 12) & 3;
                    if (wa.cpl > Sa) Cc(13);
                    wa.st16_port(xa[2] & 0xffff, xa[0] & 0xffff); {
                        if (wa.hard_irq != 0 && (wa.eflags & 0x00000200)) break yg;
                    };
                    break Ed;
                case 0x166:
                case 0x167:
                case 0x1f0:
                case 0x1f2:
                case 0x1f3:
                case 0x126:
                case 0x12e:
                case 0x136:
                case 0x13e:
                case 0x164:
                case 0x165:
                case 0x100:
                case 0x108:
                case 0x110:
                case 0x118:
                case 0x120:
                case 0x128:
                case 0x130:
                case 0x138:
                case 0x102:
                case 0x10a:
                case 0x112:
                case 0x11a:
                case 0x122:
                case 0x12a:
                case 0x132:
                case 0x13a:
                case 0x104:
                case 0x10c:
                case 0x114:
                case 0x11c:
                case 0x124:
                case 0x12c:
                case 0x134:
                case 0x13c:
                case 0x1a0:
                case 0x1a2:
                case 0x1d8:
                case 0x1d9:
                case 0x1da:
                case 0x1db:
                case 0x1dc:
                case 0x1dd:
                case 0x1de:
                case 0x1df:
                case 0x184:
                case 0x1a8:
                case 0x1f6:
                case 0x1c0:
                case 0x1d0:
                case 0x1d2:
                case 0x1fe:
                case 0x1cd:
                case 0x1ce:
                case 0x1f5:
                case 0x1f8:
                case 0x1f9:
                case 0x1fc:
                case 0x1fd:
                case 0x1fa:
                case 0x1fb:
                case 0x19e:
                case 0x19f:
                case 0x1f4:
                case 0x127:
                case 0x12f:
                case 0x137:
                case 0x13f:
                case 0x1d4:
                case 0x1d5:
                case 0x16c:
                case 0x16e:
                case 0x1a4:
                case 0x1a6:
                case 0x1aa:
                case 0x1ac:
                case 0x1ae:
                case 0x180:
                case 0x182:
                case 0x186:
                case 0x188:
                case 0x18a:
                case 0x18c:
                case 0x18e:
                case 0x19b:
                case 0x1b0:
                case 0x1b1:
                case 0x1b2:
                case 0x1b3:
                case 0x1b4:
                case 0x1b5:
                case 0x1b6:
                case 0x1b7:
                case 0x1c6:
                case 0x1cc:
                case 0x1d7:
                case 0x1e4:
                case 0x1e6:
                case 0x1ec:
                case 0x1ee:
                case 0x1cf:
                case 0x1ca:
                case 0x1cb:
                case 0x19a:
                case 0x19c:
                case 0x19d:
                case 0x1ea:
                case 0x1e0:
                case 0x1e1:
                case 0x1e2:
                case 0x1e3:
                    b &= 0xff;
                    break;
                case 0x163:
                case 0x1d6:
                case 0x1f1:
                default:
                    Cc(6);
                case 0x10f:
                    b = Ta[Kb++];;
                    b |= 0x0100;
                    switch (b) {
                    case 0x180:
                    case 0x181:
                    case 0x182:
                    case 0x183:
                    case 0x184:
                    case 0x185:
                    case 0x186:
                    case 0x187:
                    case 0x188:
                    case 0x189:
                    case 0x18a:
                    case 0x18b:
                    case 0x18c:
                    case 0x18d:
                    case 0x18e:
                    case 0x18f:
                        ga = Ob();
                        if (ed(b & 0xf)) Jb = (Jb + Kb - Mb + ga) & 0xffff,
                        Kb = Mb = 0;
                        break Ed;
                    case 0x140:
                    case 0x141:
                    case 0x142:
                    case 0x143:
                    case 0x144:
                    case 0x145:
                    case 0x146:
                    case 0x147:
                    case 0x148:
                    case 0x149:
                    case 0x14a:
                    case 0x14b:
                    case 0x14c:
                    case 0x14d:
                    case 0x14e:
                    case 0x14f:
                        Ea = Ta[Kb++];;
                        if ((Ea >> 6) == 3) {
                            ga = xa[Ea & 7];
                        } else {
                            fa = Pb(Ea);
                            ga = ib();
                        }
                        if (ed(b & 0xf)) Wb((Ea >> 3) & 7, ga);
                        break Ed;
                    case 0x1b6:
                        Ea = Ta[Kb++];;
                        Ga = (Ea >> 3) & 7;
                        if ((Ea >> 6) == 3) {
                            Fa = Ea & 7;
                            ga = (xa[Fa & 3] >> ((Fa & 4) << 1)) & 0xff;
                        } else {
                            fa = Pb(Ea);
                            ga = gb();
                        }
                        Wb(Ga, ga);
                        break Ed;
                    case 0x1be:
                        Ea = Ta[Kb++];;
                        Ga = (Ea >> 3) & 7;
                        if ((Ea >> 6) == 3) {
                            Fa = Ea & 7;
                            ga = (xa[Fa & 3] >> ((Fa & 4) << 1));
                        } else {
                            fa = Pb(Ea);
                            ga = gb();
                        }
                        Wb(Ga, (((ga) << 24) >> 24));
                        break Ed;
                    case 0x1af:
                        Ea = Ta[Kb++];;
                        Ga = (Ea >> 3) & 7;
                        if ((Ea >> 6) == 3) {
                            Ha = xa[Ea & 7];
                        } else {
                            fa = Pb(Ea);
                            Ha = ib();
                        }
                        Wb(Ga, Qc(xa[Ga], Ha));
                        break Ed;
                    case 0x1c1:
                        Ea = Ta[Kb++];;
                        Ga = (Ea >> 3) & 7;
                        if ((Ea >> 6) == 3) {
                            Fa = Ea & 7;
                            ga = xa[Fa];
                            Ha = cc(0, ga, xa[Ga]);
                            Wb(Ga, ga);
                            Wb(Fa, Ha);
                        } else {
                            fa = Pb(Ea);
                            ga = ob();
                            Ha = cc(0, ga, xa[Ga]);
                            ub(Ha);
                            Wb(Ga, ga);
                        }
                        break Ed;
                    case 0x1a0:
                    case 0x1a8:
                        ud(wa.segs[(b >> 3) & 7].selector);
                        break Ed;
                    case 0x1a1:
                    case 0x1a9:
                        Ge((b >> 3) & 7, xd());
                        yd();
                        break Ed;
                    case 0x1b2:
                    case 0x1b4:
                    case 0x1b5:
                        Rf(b & 7);
                        break Ed;
                    case 0x1a4:
                    case 0x1ac:
                        Ea = Ta[Kb++];;
                        Ha = xa[(Ea >> 3) & 7];
                        Ja = (b >> 3) & 1;
                        if ((Ea >> 6) == 3) {
                            Ia = Ta[Kb++];;
                            Fa = Ea & 7;
                            Wb(Fa, nc(Ja, xa[Fa], Ha, Ia));
                        } else {
                            fa = Pb(Ea);
                            Ia = Ta[Kb++];;
                            ga = ob();
                            ga = nc(Ja, ga, Ha, Ia);
                            ub(ga);
                        }
                        break Ed;
                    case 0x1a5:
                    case 0x1ad:
                        Ea = Ta[Kb++];;
                        Ha = xa[(Ea >> 3) & 7];
                        Ia = xa[1];
                        Ja = (b >> 3) & 1;
                        if ((Ea >> 6) == 3) {
                            Fa = Ea & 7;
                            Wb(Fa, nc(Ja, xa[Fa], Ha, Ia));
                        } else {
                            fa = Pb(Ea);
                            ga = ob();
                            ga = nc(Ja, ga, Ha, Ia);
                            ub(ga);
                        }
                        break Ed;
                    case 0x1ba:
                        Ea = Ta[Kb++];;
                        Ja = (Ea >> 3) & 7;
                        switch (Ja) {
                        case 4:
                            if ((Ea >> 6) == 3) {
                                ga = xa[Ea & 7];
                                Ha = Ta[Kb++];;
                            } else {
                                fa = Pb(Ea);
                                Ha = Ta[Kb++];;
                                ga = ib();
                            }
                            sc(ga, Ha);
                            break;
                        case 5:
                        case 6:
                        case 7:
                            if ((Ea >> 6) == 3) {
                                Fa = Ea & 7;
                                Ha = Ta[Kb++];;
                                xa[Fa] = uc(Ja & 3, xa[Fa], Ha);
                            } else {
                                fa = Pb(Ea);
                                Ha = Ta[Kb++];;
                                ga = ob();
                                ga = uc(Ja & 3, ga, Ha);
                                ub(ga);
                            }
                            break;
                        default:
                            Cc(6);
                        }
                        break Ed;
                    case 0x1a3:
                        Ea = Ta[Kb++];;
                        Ha = xa[(Ea >> 3) & 7];
                        if ((Ea >> 6) == 3) {
                            ga = xa[Ea & 7];
                        } else {
                            fa = Pb(Ea);
                            fa = (fa + (((Ha & 0xffff) >> 4) << 1)) >> 0;
                            ga = ib();
                        }
                        sc(ga, Ha);
                        break Ed;
                    case 0x1ab:
                    case 0x1b3:
                    case 0x1bb:
                        Ea = Ta[Kb++];;
                        Ha = xa[(Ea >> 3) & 7];
                        Ja = (b >> 3) & 3;
                        if ((Ea >> 6) == 3) {
                            Fa = Ea & 7;
                            Wb(Fa, uc(Ja, xa[Fa], Ha));
                        } else {
                            fa = Pb(Ea);
                            fa = (fa + (((Ha & 0xffff) >> 4) << 1)) >> 0;
                            ga = ob();
                            ga = uc(Ja, ga, Ha);
                            ub(ga);
                        }
                        break Ed;
                    case 0x1bc:
                    case 0x1bd:
                        Ea = Ta[Kb++];;
                        Ga = (Ea >> 3) & 7;
                        if ((Ea >> 6) == 3) {
                            Ha = xa[Ea & 7];
                        } else {
                            fa = Pb(Ea);
                            Ha = ib();
                        }
                        ga = xa[Ga];
                        if (b & 1) ga = zc(ga, Ha);
                        else ga = xc(ga, Ha);
                        Wb(Ga, ga);
                        break Ed;
                    case 0x1b1:
                        Ea = Ta[Kb++];;
                        Ga = (Ea >> 3) & 7;
                        if ((Ea >> 6) == 3) {
                            Fa = Ea & 7;
                            ga = xa[Fa];
                            Ha = cc(5, xa[0], ga);
                            if (Ha == 0) {
                                Wb(Fa, xa[Ga]);
                            } else {
                                Wb(0, ga);
                            }
                        } else {
                            fa = Pb(Ea);
                            ga = ob();
                            Ha = cc(5, xa[0], ga);
                            if (Ha == 0) {
                                ub(xa[Ga]);
                            } else {
                                Wb(0, ga);
                            }
                        }
                        break Ed;
                    case 0x100:
                    case 0x101:
                    case 0x102:
                    case 0x103:
                    case 0x120:
                    case 0x122:
                    case 0x106:
                    case 0x123:
                    case 0x1a2:
                    case 0x131:
                    case 0x190:
                    case 0x191:
                    case 0x192:
                    case 0x193:
                    case 0x194:
                    case 0x195:
                    case 0x196:
                    case 0x197:
                    case 0x198:
                    case 0x199:
                    case 0x19a:
                    case 0x19b:
                    case 0x19c:
                    case 0x19d:
                    case 0x19e:
                    case 0x19f:
                    case 0x1b0:
                        b = 0x0f;
                        Kb--;
                        break;
                    case 0x104:
                    case 0x105:
                    case 0x107:
                    case 0x108:
                    case 0x109:
                    case 0x10a:
                    case 0x10b:
                    case 0x10c:
                    case 0x10d:
                    case 0x10e:
                    case 0x10f:
                    case 0x110:
                    case 0x111:
                    case 0x112:
                    case 0x113:
                    case 0x114:
                    case 0x115:
                    case 0x116:
                    case 0x117:
                    case 0x118:
                    case 0x119:
                    case 0x11a:
                    case 0x11b:
                    case 0x11c:
                    case 0x11d:
                    case 0x11e:
                    case 0x11f:
                    case 0x121:
                    case 0x124:
                    case 0x125:
                    case 0x126:
                    case 0x127:
                    case 0x128:
                    case 0x129:
                    case 0x12a:
                    case 0x12b:
                    case 0x12c:
                    case 0x12d:
                    case 0x12e:
                    case 0x12f:
                    case 0x130:
                    case 0x132:
                    case 0x133:
                    case 0x134:
                    case 0x135:
                    case 0x136:
                    case 0x137:
                    case 0x138:
                    case 0x139:
                    case 0x13a:
                    case 0x13b:
                    case 0x13c:
                    case 0x13d:
                    case 0x13e:
                    case 0x13f:
                    case 0x150:
                    case 0x151:
                    case 0x152:
                    case 0x153:
                    case 0x154:
                    case 0x155:
                    case 0x156:
                    case 0x157:
                    case 0x158:
                    case 0x159:
                    case 0x15a:
                    case 0x15b:
                    case 0x15c:
                    case 0x15d:
                    case 0x15e:
                    case 0x15f:
                    case 0x160:
                    case 0x161:
                    case 0x162:
                    case 0x163:
                    case 0x164:
                    case 0x165:
                    case 0x166:
                    case 0x167:
                    case 0x168:
                    case 0x169:
                    case 0x16a:
                    case 0x16b:
                    case 0x16c:
                    case 0x16d:
                    case 0x16e:
                    case 0x16f:
                    case 0x170:
                    case 0x171:
                    case 0x172:
                    case 0x173:
                    case 0x174:
                    case 0x175:
                    case 0x176:
                    case 0x177:
                    case 0x178:
                    case 0x179:
                    case 0x17a:
                    case 0x17b:
                    case 0x17c:
                    case 0x17d:
                    case 0x17e:
                    case 0x17f:
                    case 0x1a6:
                    case 0x1a7:
                    case 0x1aa:
                    case 0x1ae:
                    case 0x1b7:
                    case 0x1b8:
                    case 0x1b9:
                    case 0x1bf:
                    case 0x1c0:
                    default:
                        Cc(6);
                    }
                    break;
                }
            }
        }
    } while (-- Ka );
    this.cycle_count += (ua - Ka);
    this.eip = (Jb + Kb - Mb);
    this.cc_src = ya;
    this.cc_dst = za;
    this.cc_op = Aa;
    this.cc_op2 = Ba;
    this.cc_dst2 = Ca;
    return La;
};
CPU_X86.prototype.exec = function(ua) {
    var Ag, La, Bg, va;
    Bg = this.cycle_count + ua;
    La = 256;
    va = null;
    while (this.cycle_count < Bg) {
        try {
            La = this.exec_internal(Bg - this.cycle_count, va);
            if (La != 256) break;
            va = null;
        } catch(Cg) {
            if (Cg.hasOwnProperty("intno")) {
                va = Cg;
            } else {
                throw Cg;
            }
        }
    }
    return La;
};
CPU_X86.prototype.load_binary = function(Dg, fa, Eg) {
    var Fg, wa;
    wa = this;
    Fg = function(Gg, ng) {
        var i;
        if (ng < 0) {
            Eg(ng);
        } else {
            if (typeof Gg == "string") {
                for (i = 0; i < ng; i++) {
                    wa.st8_phys(fa + i, Gg.charCodeAt(i));
                }
            } else {
                for (i = 0; i < ng; i++) {
                    wa.st8_phys(fa + i, Gg[i]);
                }
            }
            Eg(ng);
        }
    };
    load_binary(Dg, Fg);
};
function Hg(a) {
    return ((a / 10) << 4) | (a % 10);
}
function Ig(n) {
    return new Uint8Array(n);
}
function Jg(Kg) {
    var Lg, d;
    Lg = Ig(128);
    this.cmos_data = Lg;
    this.cmos_index = 0;
    d = new Date();
    Lg[0] = Hg(d.getUTCSeconds());
    Lg[2] = Hg(d.getUTCMinutes());
    Lg[4] = Hg(d.getUTCHours());
    Lg[6] = Hg(d.getUTCDay());
    Lg[7] = Hg(d.getUTCDate());
    Lg[8] = Hg(d.getUTCMonth() + 1);
    Lg[9] = Hg(d.getUTCFullYear() % 100);
    Lg[10] = 0x26;
    Lg[11] = 0x02;
    Lg[12] = 0x00;
    Lg[13] = 0x80;
    Lg[0x14] = 0x02;
    Kg.register_ioport_write(0x70, 2, 1, this.ioport_write.bind(this));
    Kg.register_ioport_read(0x70, 2, 1, this.ioport_read.bind(this));
}
Jg.prototype.ioport_write = function(fa, Gg) {
    if (fa == 0x70) {
        this.cmos_index = Gg & 0x7f;
    }
};
Jg.prototype.ioport_read = function(fa) {
    var Mg;
    if (fa == 0x70) {
        return 0xff;
    } else {
        Mg = this.cmos_data[this.cmos_index];
        if (this.cmos_index == 10) this.cmos_data[10] ^= 0x80;
        else if (this.cmos_index == 12) this.cmos_data[12] = 0x00;
        return Mg;
    }
};
function Ng(Kg, Vf) {
    Kg.register_ioport_write(Vf, 2, 1, this.ioport_write.bind(this));
    Kg.register_ioport_read(Vf, 2, 1, this.ioport_read.bind(this));
    this.reset();
}
Ng.prototype.reset = function() {
    this.last_irr = 0;
    this.irr = 0;
    this.imr = 0;
    this.isr = 0;
    this.priority_add = 0;
    this.irq_base = 0;
    this.read_reg_select = 0;
    this.special_mask = 0;
    this.init_state = 0;
    this.auto_eoi = 0;
    this.rotate_on_autoeoi = 0;
    this.init4 = 0;
    this.elcr = 0;
    this.elcr_mask = 0;
};
Ng.prototype.set_irq1 = function(Og, Mf) {
    var vc;
    vc = 1 << Og;
    if (Mf) {
        if ((this.last_irr & vc) == 0) this.irr |= vc;
        this.last_irr |= vc;
    } else {
        this.last_irr &= ~vc;
    }
};
Ng.prototype.get_priority = function(vc) {
    var Pg;
    if (vc == 0) return - 1;
    Pg = 7;
    while ((vc & (1 << ((Pg + this.priority_add) & 7))) == 0) Pg--;
    return Pg;
};
Ng.prototype.get_irq = function() {
    var vc, Qg, Pg;
    vc = this.irr & ~this.imr;
    Pg = this.get_priority(vc);
    if (Pg < 0) return - 1;
    Qg = this.get_priority(this.isr);
    if (Pg > Qg) {
        return Pg;
    } else {
        return - 1;
    }
};
Ng.prototype.intack = function(Og) {
    if (this.auto_eoi) {
        if (this.rotate_on_auto_eoi) this.priority_add = (Og + 1) & 7;
    } else {
        this.isr |= (1 << Og);
    }
    if (! (this.elcr & (1 << Og))) this.irr &= ~ (1 << Og);
};
Ng.prototype.ioport_write = function(fa, ga) {
    var Pg;
    fa &= 1;
    if (fa == 0) {
        if (ga & 0x10) {
            this.reset();
            this.init_state = 1;
            this.init4 = ga & 1;
            if (ga & 0x02) throw "single mode not supported";
            if (ga & 0x08) throw "level sensitive irq not supported";
        } else if (ga & 0x08) {
            if (ga & 0x02) this.read_reg_select = ga & 1;
            if (ga & 0x40) this.special_mask = (ga >> 5) & 1;
        } else {
            switch (ga) {
            case 0x00:
            case 0x80:
                this.rotate_on_autoeoi = ga >> 7;
                break;
            case 0x20:
            case 0xa0:
                Pg = this.get_priority(this.isr);
                if (Pg >= 0) {
                    this.isr &= ~ (1 << ((Pg + this.priority_add) & 7));
                }
                if (ga == 0xa0) this.priority_add = (this.priority_add + 1) & 7;
                break;
            case 0x60:
            case 0x61:
            case 0x62:
            case 0x63:
            case 0x64:
            case 0x65:
            case 0x66:
            case 0x67:
                Pg = ga & 7;
                this.isr &= ~ (1 << Pg);
                break;
            case 0xc0:
            case 0xc1:
            case 0xc2:
            case 0xc3:
            case 0xc4:
            case 0xc5:
            case 0xc6:
            case 0xc7:
                this.priority_add = (ga + 1) & 7;
                break;
            case 0xe0:
            case 0xe1:
            case 0xe2:
            case 0xe3:
            case 0xe4:
            case 0xe5:
            case 0xe6:
            case 0xe7:
                Pg = ga & 7;
                this.isr &= ~ (1 << Pg);
                this.priority_add = (Pg + 1) & 7;
                break;
            }
        }
    } else {
        switch (this.init_state) {
        case 0:
            this.imr = ga;
            this.update_irq();
            break;
        case 1:
            this.irq_base = ga & 0xf8;
            this.init_state = 2;
            break;
        case 2:
            if (this.init4) {
                this.init_state = 3;
            } else {
                this.init_state = 0;
            }
            break;
        case 3:
            this.auto_eoi = (ga >> 1) & 1;
            this.init_state = 0;
            break;
        }
    }
};
Ng.prototype.ioport_read = function(Rg) {
    var fa, Mg;
    fa = Rg & 1;
    if (fa == 0) {
        if (this.read_reg_select) Mg = this.isr;
        else Mg = this.irr;
    } else {
        Mg = this.imr;
    }
    return Mg;
};
function Sg(Kg, Tg, Rg, Ug) {
    this.pics = new Array();
    this.pics[0] = new Ng(Kg, Tg);
    this.pics[1] = new Ng(Kg, Rg);
    this.pics[0].elcr_mask = 0xf8;
    this.pics[1].elcr_mask = 0xde;
    this.irq_requested = 0;
    this.cpu_set_irq = Ug;
    this.pics[0].update_irq = this.update_irq.bind(this);
    this.pics[1].update_irq = this.update_irq.bind(this);
}
Sg.prototype.update_irq = function() {
    var Vg, Og;
    Vg = this.pics[1].get_irq();
    if (Vg >= 0) {
        this.pics[0].set_irq1(2, 1);
        this.pics[0].set_irq1(2, 0);
    }
    Og = this.pics[0].get_irq();
    if (Og >= 0) {
        this.cpu_set_irq(1);
    } else {
        this.cpu_set_irq(0);
    }
};
Sg.prototype.set_irq = function(Og, Mf) {
    this.pics[Og >> 3].set_irq1(Og & 7, Mf);
    this.update_irq();
};
Sg.prototype.get_hard_intno = function() {
    var Og, Vg, intno;
    Og = this.pics[0].get_irq();
    if (Og >= 0) {
        this.pics[0].intack(Og);
        if (Og == 2) {
            Vg = this.pics[1].get_irq();
            if (Vg >= 0) {
                this.pics[1].intack(Vg);
            } else {
                Vg = 7;
            }
            intno = this.pics[1].irq_base + Vg;
            Og = Vg + 8;
        } else {
            intno = this.pics[0].irq_base + Og;
        }
    } else {
        Og = 7;
        intno = this.pics[0].irq_base + Og;
    }
    this.update_irq();
    return intno;
};
function Wg(Kg, Xg, Yg) {
    var s, i;
    this.pit_channels = new Array();
    for (i = 0; i < 3; i++) {
        s = new Zg(Yg);
        this.pit_channels[i] = s;
        s.mode = 3;
        s.gate = (i != 2) >> 0;
        s.pit_load_count(0);
    }
    this.speaker_data_on = 0;
    this.set_irq = Xg;
    Kg.register_ioport_write(0x40, 4, 1, this.ioport_write.bind(this));
    Kg.register_ioport_read(0x40, 3, 1, this.ioport_read.bind(this));
    Kg.register_ioport_read(0x61, 1, 1, this.speaker_ioport_read.bind(this));
    Kg.register_ioport_write(0x61, 1, 1, this.speaker_ioport_write.bind(this));
}
function Zg(Yg) {
    this.count = 0;
    this.latched_count = 0;
    this.rw_state = 0;
    this.mode = 0;
    this.bcd = 0;
    this.gate = 0;
    this.count_load_time = 0;
    this.get_ticks = Yg;
    this.pit_time_unit = 1193182 / 2000000;
}
Zg.prototype.get_time = function() {
    return Math.floor(this.get_ticks() * this.pit_time_unit);
};
Zg.prototype.pit_get_count = function() {
    var d, ah;
    d = this.get_time() - this.count_load_time;
    switch (this.mode) {
    case 0:
    case 1:
    case 4:
    case 5:
        ah = (this.count - d) & 0xffff;
        break;
    default:
        ah = this.count - (d % this.count);
        break;
    }
    return ah;
};
Zg.prototype.pit_get_out = function() {
    var d, bh;
    d = this.get_time() - this.count_load_time;
    switch (this.mode) {
    default:
    case 0:
        bh = (d >= this.count) >> 0;
        break;
    case 1:
        bh = (d < this.count) >> 0;
        break;
    case 2:
        if ((d % this.count) == 0 && d != 0) bh = 1;
        else bh = 0;
        break;
    case 3:
        bh = ((d % this.count) < (this.count >> 1)) >> 0;
        break;
    case 4:
    case 5:
        bh = (d == this.count) >> 0;
        break;
    }
    return bh;
};
Zg.prototype.get_next_transition_time = function() {
    var d, ch, base, dh;
    d = this.get_time() - this.count_load_time;
    switch (this.mode) {
    default:
    case 0:
    case 1:
        if (d < this.count) ch = this.count;
        else return - 1;
        break;
    case 2:
        base = (d / this.count) * this.count;
        if ((d - base) == 0 && d != 0) ch = base + this.count;
        else ch = base + this.count + 1;
        break;
    case 3:
        base = (d / this.count) * this.count;
        dh = ((this.count + 1) >> 1);
        if ((d - base) < dh) ch = base + dh;
        else ch = base + this.count;
        break;
    case 4:
    case 5:
        if (d < this.count) ch = this.count;
        else if (d == this.count) ch = this.count + 1;
        else return - 1;
        break;
    }
    ch = this.count_load_time + ch;
    return ch;
};
Zg.prototype.pit_load_count = function(ga) {
    if (ga == 0) ga = 0x10000;
    this.count_load_time = this.get_time();
    this.count = ga;
};
Wg.prototype.ioport_write = function(fa, ga) {
    var eh, fh, s;
    fa &= 3;
    if (fa == 3) {
        eh = ga >> 6;
        if (eh == 3) return;
        s = this.pit_channels[eh];
        fh = (ga >> 4) & 3;
        switch (fh) {
        case 0:
            s.latched_count = s.pit_get_count();
            s.rw_state = 4;
            break;
        default:
            s.mode = (ga >> 1) & 7;
            s.bcd = ga & 1;
            s.rw_state = fh - 1 + 0;
            break;
        }
    } else {
        s = this.pit_channels[fa];
        switch (s.rw_state) {
        case 0:
            s.pit_load_count(ga);
            break;
        case 1:
            s.pit_load_count(ga << 8);
            break;
        case 2:
        case 3:
            if (s.rw_state & 1) {
                s.pit_load_count((s.latched_count & 0xff) | (ga << 8));
            } else {
                s.latched_count = ga;
            }
            s.rw_state ^= 1;
            break;
        }
    }
};
Wg.prototype.ioport_read = function(fa) {
    var Mg, ma, s;
    fa &= 3;
    s = this.pit_channels[fa];
    switch (s.rw_state) {
    case 0:
    case 1:
    case 2:
    case 3:
        ma = s.pit_get_count();
        if (s.rw_state & 1) Mg = (ma >> 8) & 0xff;
        else Mg = ma & 0xff;
        if (s.rw_state & 2) s.rw_state ^= 1;
        break;
    default:
    case 4:
    case 5:
        if (s.rw_state & 1) Mg = s.latched_count >> 8;
        else Mg = s.latched_count & 0xff;
        s.rw_state ^= 1;
        break;
    }
    return Mg;
};
Wg.prototype.speaker_ioport_write = function(fa, ga) {
    this.speaker_data_on = (ga >> 1) & 1;
    this.pit_channels[2].gate = ga & 1;
};
Wg.prototype.speaker_ioport_read = function(fa) {
    var bh, s, ga;
    s = this.pit_channels[2];
    bh = s.pit_get_out();
    ga = (this.speaker_data_on << 1) | s.gate | (bh << 5);
    return ga;
};
Wg.prototype.update_irq = function() {
    this.set_irq(1);
    this.set_irq(0);
};
function gh(Kg, fa, hh, ih) {
    this.divider = 0;
    this.rbr = 0;
    this.ier = 0;
    this.iir = 0x01;
    this.lcr = 0;
    this.mcr = 0;
    this.lsr = 0x40 | 0x20;
    this.msr = 0;
    this.scr = 0;
    this.fcr = 0;
    this.set_irq_func = hh;
    this.write_func = ih;
    this.tx_fifo = "";
    this.rx_fifo = "";
    Kg.register_ioport_write(0x3f8, 8, 1, this.ioport_write.bind(this));
    Kg.register_ioport_read(0x3f8, 8, 1, this.ioport_read.bind(this));
}
gh.prototype.update_irq = function() {
    if ((this.lsr & 0x01) && (this.ier & 0x01)) {
        this.iir = 0x04;
    } else if ((this.lsr & 0x20) && (this.ier & 0x02)) {
        this.iir = 0x02;
    } else {
        this.iir = 0x01;
    }
    if (this.iir != 0x01) {
        this.set_irq_func(1);
    } else {
        this.set_irq_func(0);
    }
};
gh.prototype.write_tx_fifo = function() {
    if (this.tx_fifo != "") {
        this.write_func(this.tx_fifo);
        this.tx_fifo = "";
        this.lsr |= 0x20;
        this.lsr |= 0x40;
        this.update_irq();
    }
};
gh.prototype.ioport_write = function(fa, ga) {
    fa &= 7;
    switch (fa) {
    default:
    case 0:
        if (this.lcr & 0x80) {
            this.divider = (this.divider & 0xff00) | ga;
        } else {
            if (this.fcr & 0x01) {
                this.tx_fifo += String.fromCharCode(ga);
                this.lsr &= ~0x20;
                this.update_irq();
                if (this.tx_fifo.length >= 16) {
                    this.write_tx_fifo();
                }
            } else {
                this.lsr &= ~0x20;
                this.update_irq();
                this.write_func(String.fromCharCode(ga));
                this.lsr |= 0x20;
                this.lsr |= 0x40;
                this.update_irq();
            }
        }
        break;
    case 1:
        if (this.lcr & 0x80) {
            this.divider = (this.divider & 0x00ff) | (ga << 8);
        } else {
            this.ier = ga;
            this.update_irq();
        }
        break;
    case 2:
        if ((this.fcr ^ ga) & 0x01) {
            ga |= 0x04 | 0x02;
        }
        if (ga & 0x04) this.tx_fifo = "";
        if (ga & 0x02) this.rx_fifo = "";
        this.fcr = ga & 0x01;
        break;
    case 3:
        this.lcr = ga;
        break;
    case 4:
        this.mcr = ga;
        break;
    case 5:
        break;
    case 6:
        this.msr = ga;
        break;
    case 7:
        this.scr = ga;
        break;
    }
};
gh.prototype.ioport_read = function(fa) {
    var Mg;
    fa &= 7;
    switch (fa) {
    default:
    case 0:
        if (this.lcr & 0x80) {
            Mg = this.divider & 0xff;
        } else {
            Mg = this.rbr;
            this.lsr &= ~ (0x01 | 0x10);
            this.update_irq();
            this.send_char_from_fifo();
        }
        break;
    case 1:
        if (this.lcr & 0x80) {
            Mg = (this.divider >> 8) & 0xff;
        } else {
            Mg = this.ier;
        }
        break;
    case 2:
        Mg = this.iir;
        if (this.fcr & 0x01) Mg |= 0xC0;
        break;
    case 3:
        Mg = this.lcr;
        break;
    case 4:
        Mg = this.mcr;
        break;
    case 5:
        Mg = this.lsr;
        break;
    case 6:
        Mg = this.msr;
        break;
    case 7:
        Mg = this.scr;
        break;
    }
    return Mg;
};
gh.prototype.send_break = function() {
    this.rbr = 0;
    this.lsr |= 0x10 | 0x01;
    this.update_irq();
};
gh.prototype.send_char = function(jh) {
    this.rbr = jh;
    this.lsr |= 0x01;
    this.update_irq();
};
gh.prototype.send_char_from_fifo = function() {
    var kh;
    kh = this.rx_fifo;
    if (kh != "" && !(this.lsr & 0x01)) {
        this.send_char(kh.charCodeAt(0));
        this.rx_fifo = kh.substr(1, kh.length - 1);
    }
};
gh.prototype.send_chars = function(na) {
    this.rx_fifo += na;
    this.send_char_from_fifo();
};
function lh(Kg, mh) {
    Kg.register_ioport_read(0x64, 1, 1, this.read_status.bind(this));
    Kg.register_ioport_write(0x64, 1, 1, this.write_command.bind(this));
    this.reset_request = mh;
}
lh.prototype.read_status = function(fa) {
    return 0;
};
lh.prototype.write_command = function(fa, ga) {
    switch (ga) {
    case 0xfe:
        this.reset_request();
        break;
    default:
        break;
    }
};
function nh(Kg, Vf, oh, ih, ph) {
    Kg.register_ioport_read(Vf, 16, 4, this.ioport_readl.bind(this));
    Kg.register_ioport_write(Vf, 16, 4, this.ioport_writel.bind(this));
    Kg.register_ioport_read(Vf + 8, 1, 1, this.ioport_readb.bind(this));
    Kg.register_ioport_write(Vf + 8, 1, 1, this.ioport_writeb.bind(this));
    this.cur_pos = 0;
    this.doc_str = "";
    this.read_func = oh;
    this.write_func = ih;
    this.get_boot_time = ph;
}
nh.prototype.ioport_writeb = function(fa, ga) {
    this.doc_str += String.fromCharCode(ga);
};
nh.prototype.ioport_readb = function(fa) {
    var c, na, ga;
    na = this.doc_str;
    if (this.cur_pos < na.length) {
        ga = na.charCodeAt(this.cur_pos) & 0xff;
    } else {
        ga = 0;
    }
    this.cur_pos++;
    return ga;
};
nh.prototype.ioport_writel = function(fa, ga) {
    var na;
    fa = (fa >> 2) & 3;
    switch (fa) {
    case 0:
        this.doc_str = this.doc_str.substr(0, ga >>> 0);
        break;
    case 1:
        return this.cur_pos = ga >>> 0;
    case 2:
        na = String.fromCharCode(ga & 0xff) + String.fromCharCode((ga >> 8) & 0xff) + String.fromCharCode((ga >> 16) & 0xff) + String.fromCharCode((ga >> 24) & 0xff);
        this.doc_str += na;
        break;
    case 3:
        this.write_func(this.doc_str);
    }
};
nh.prototype.ioport_readl = function(fa) {
    var ga;
    fa = (fa >> 2) & 3;
    switch (fa) {
    case 0:
        this.doc_str = this.read_func();
        return this.doc_str.length >> 0;
    case 1:
        return this.cur_pos >> 0;
    case 2:
        ga = this.ioport_readb(0);
        ga |= this.ioport_readb(0) << 8;
        ga |= this.ioport_readb(0) << 16;
        ga |= this.ioport_readb(0) << 24;
        return ga;
    case 3:
        if (this.get_boot_time) return this.get_boot_time() >> 0;
        else return 0;
    }
};
qh.prototype.identify = function() {
    function rh(sh, v) {
        th[sh * 2] = v & 0xff;
        th[sh * 2 + 1] = (v >> 8) & 0xff;
    }
    function uh(sh, na, ng) {
        var i, v;
        for (i = 0; i < ng; i++) {
            if (i < na.length) {
                v = na.charCodeAt(i) & 0xff;
            } else {
                v = 32;
            }
            th[sh * 2 + (i ^ 1)] = v;
        }
    }
    var th, i, vh;
    th = this.io_buffer;
    for (i = 0; i < 512; i++) th[i] = 0;
    rh(0, 0x0040);
    rh(1, this.cylinders);
    rh(3, this.heads);
    rh(4, 512 * this.sectors);
    rh(5, 512);
    rh(6, this.sectors);
    rh(20, 3);
    rh(21, 512);
    rh(22, 4);
    uh(27, "JSLinux HARDDISK", 40);
    rh(47, 0x8000 | 128);
    rh(48, 0);
    rh(49, 1 << 9);
    rh(51, 0x200);
    rh(52, 0x200);
    rh(54, this.cylinders);
    rh(55, this.heads);
    rh(56, this.sectors);
    vh = this.cylinders * this.heads * this.sectors;
    rh(57, vh);
    rh(58, vh >> 16);
    if (this.mult_sectors) rh(59, 0x100 | this.mult_sectors);
    rh(60, this.nb_sectors);
    rh(61, this.nb_sectors >> 16);
    rh(80, (1 << 1) | (1 << 2));
    rh(82, (1 << 14));
    rh(83, (1 << 14));
    rh(84, (1 << 14));
    rh(85, (1 << 14));
    rh(86, 0);
    rh(87, (1 << 14));
};
qh.prototype.set_signature = function() {
    this.select &= 0xf0;
    this.nsector = 1;
    this.sector = 1;
    this.lcyl = 0;
    this.hcyl = 0;
};
qh.prototype.abort_command = function() {
    this.status = 0x40 | 0x01;
    this.error = 0x04;
};
qh.prototype.set_irq = function() {
    if (! (this.cmd & 0x02)) {
        this.ide_if.set_irq_func(1);
    }
};
qh.prototype.transfer_start = function(wh, xh) {
    this.end_transfer_func = xh;
    this.data_index = 0;
    this.data_end = wh;
};
qh.prototype.transfer_stop = function() {
    this.end_transfer_func = this.transfer_stop.bind(this);
    this.data_index = 0;
    this.data_end = 0;
};
qh.prototype.get_sector = function() {
    var yh;
    if (this.select & 0x40) {
        yh = ((this.select & 0x0f) << 24) | (this.hcyl << 16) | (this.lcyl << 8) | this.sector;
    } else {
        yh = ((this.hcyl << 8) | this.lcyl) * this.heads * this.sectors + (this.select & 0x0f) * this.sectors + (this.sector - 1);
    }
    return yh;
};
qh.prototype.set_sector = function(yh) {
    var zh, r;
    if (this.select & 0x40) {
        this.select = (this.select & 0xf0) | ((yh >> 24) & 0x0f);
        this.hcyl = (yh >> 16) & 0xff;
        this.lcyl = (yh >> 8) & 0xff;
        this.sector = yh & 0xff;
    } else {
        zh = yh / (this.heads * this.sectors);
        r = yh % (this.heads * this.sectors);
        this.hcyl = (zh >> 8) & 0xff;
        this.lcyl = zh & 0xff;
        this.select = (this.select & 0xf0) | ((r / this.sectors) & 0x0f);
        this.sector = (r % this.sectors) + 1;
    }
};
qh.prototype.sector_read = function() {
    var yh, n, Mg;
    yh = this.get_sector();
    n = this.nsector;
    if (n == 0) n = 256;
    if (n > this.req_nb_sectors) n = this.req_nb_sectors;
    this.io_nb_sectors = n;
    Mg = this.bs.read_async(yh, this.io_buffer, n, this.sector_read_cb.bind(this));
    if (Mg < 0) {
        this.abort_command();
        this.set_irq();
    } else if (Mg == 0) {
        this.sector_read_cb();
    } else {
        this.status = 0x40 | 0x10 | 0x80;
        this.error = 0;
    }
};
qh.prototype.sector_read_cb = function() {
    var n, Ah;
    n = this.io_nb_sectors;
    this.set_sector(this.get_sector() + n);
    this.nsector = (this.nsector - n) & 0xff;
    if (this.nsector == 0) Ah = this.sector_read_cb_end.bind(this);
    else Ah = this.sector_read.bind(this);
    this.transfer_start(512 * n, Ah);
    this.set_irq();
    this.status = 0x40 | 0x10 | 0x08;
    this.error = 0;
};
qh.prototype.sector_read_cb_end = function() {
    this.status = 0x40 | 0x10;
    this.error = 0;
    this.transfer_stop();
};
qh.prototype.sector_write_cb1 = function() {
    var yh, Mg;
    this.transfer_stop();
    yh = this.get_sector();
    Mg = this.bs.write_async(yh, this.io_buffer, this.io_nb_sectors, this.sector_write_cb2.bind(this));
    if (Mg < 0) {
        this.abort_command();
        this.set_irq();
    } else if (Mg == 0) {
        this.sector_write_cb2();
    } else {
        this.status = 0x40 | 0x10 | 0x80;
    }
};
qh.prototype.sector_write_cb2 = function() {
    var n;
    n = this.io_nb_sectors;
    this.set_sector(this.get_sector() + n);
    this.nsector = (this.nsector - n) & 0xff;
    if (this.nsector == 0) {
        this.status = 0x40 | 0x10;
    } else {
        n = this.nsector;
        if (n > this.req_nb_sectors) n = this.req_nb_sectors;
        this.io_nb_sectors = n;
        this.transfer_start(512 * n, this.sector_write_cb1.bind(this));
        this.status = 0x40 | 0x10 | 0x08;
    }
    this.set_irq();
};
qh.prototype.sector_write = function() {
    var n;
    n = this.nsector;
    if (n == 0) n = 256;
    if (n > this.req_nb_sectors) n = this.req_nb_sectors;
    this.io_nb_sectors = n;
    this.transfer_start(512 * n, this.sector_write_cb1.bind(this));
    this.status = 0x40 | 0x10 | 0x08;
};
qh.prototype.identify_cb = function() {
    this.transfer_stop();
    this.status = 0x40;
};
qh.prototype.exec_cmd = function(ga) {
    var n;
    switch (ga) {
    case 0xA1:
    case 0xEC:
        this.identify();
        this.status = 0x40 | 0x10 | 0x08;
        this.transfer_start(512, this.identify_cb.bind(this));
        this.set_irq();
        break;
    case 0x91:
    case 0x10:
        this.error = 0;
        this.status = 0x40 | 0x10;
        this.set_irq();
        break;
    case 0xC6:
        if (this.nsector > 128 || (this.nsector & (this.nsector - 1)) != 0) {
            this.abort_command();
        } else {
            this.mult_sectors = this.nsector;
            this.status = 0x40;
        }
        this.set_irq();
        break;
    case 0x20:
    case 0x21:
        this.req_nb_sectors = 1;
        this.sector_read();
        break;
    case 0x30:
    case 0x31:
        this.req_nb_sectors = 1;
        this.sector_write();
        break;
    case 0xC4:
        if (!this.mult_sectors) {
            this.abort_command();
            this.set_irq();
        } else {
            this.req_nb_sectors = this.mult_sectors;
            this.sector_read();
        }
        break;
    case 0xC5:
        if (!this.mult_sectors) {
            this.abort_command();
            this.set_irq();
        } else {
            this.req_nb_sectors = this.mult_sectors;
            this.sector_write();
        }
        break;
    case 0xF8:
        this.set_sector(this.nb_sectors - 1);
        this.status = 0x40;
        this.set_irq();
        break;
    default:
        this.abort_command();
        this.set_irq();
        break;
    }
};
Bh.prototype.ioport_write = function(fa, ga) {
    var s = this.cur_drive;
    var Ch;
    fa &= 7;
    switch (fa) {
    case 0:
        break;
    case 1:
        if (s) {
            s.feature = ga;
        }
        break;
    case 2:
        if (s) {
            s.nsector = ga;
        }
        break;
    case 3:
        if (s) {
            s.sector = ga;
        }
        break;
    case 4:
        if (s) {
            s.lcyl = ga;
        }
        break;
    case 5:
        if (s) {
            s.hcyl = ga;
        }
        break;
    case 6:
        s = this.cur_drive = this.drives[(ga >> 4) & 1];
        if (s) {
            s.select = ga;
        }
        break;
    default:
    case 7:
        if (s) {
            s.exec_cmd(ga);
        }
        break;
    }
};
Bh.prototype.ioport_read = function(fa) {
    var s = this.cur_drive;
    var Mg;
    fa &= 7;
    if (!s) {
        Mg = 0xff;
    } else {
        switch (fa) {
        case 0:
            Mg = 0xff;
            break;
        case 1:
            Mg = s.error;
            break;
        case 2:
            Mg = s.nsector;
            break;
        case 3:
            Mg = s.sector;
            break;
        case 4:
            Mg = s.lcyl;
            break;
        case 5:
            Mg = s.hcyl;
            break;
        case 6:
            Mg = s.select;
            break;
        default:
        case 7:
            Mg = s.status;
            this.set_irq_func(0);
            break;
        }
    }
    return Mg;
};
Bh.prototype.status_read = function(fa) {
    var s = this.cur_drive;
    var Mg;
    if (s) {
        Mg = s.status;
    } else {
        Mg = 0;
    }
    return Mg;
};
Bh.prototype.cmd_write = function(fa, ga) {
    var i, s;
    if (! (this.cmd & 0x04) && (ga & 0x04)) {
        for (i = 0; i < 2; i++) {
            s = this.drives[i];
            if (s) {
                s.status = 0x80 | 0x10;
                s.error = 0x01;
            }
        }
    } else if ((this.cmd & 0x04) && !(ga & 0x04)) {
        for (i = 0; i < 2; i++) {
            s = this.drives[i];
            if (s) {
                s.status = 0x40 | 0x10;
                s.set_signature();
            }
        }
    }
    for (i = 0; i < 2; i++) {
        s = this.drives[i];
        if (s) {
            s.cmd = ga;
        }
    }
};
Bh.prototype.data_writew = function(fa, ga) {
    var s = this.cur_drive;
    var p, th;
    if (!s) return;
    p = s.data_index;
    th = s.io_buffer;
    th[p] = ga & 0xff;
    th[p + 1] = (ga >> 8) & 0xff;
    p += 2;
    s.data_index = p;
    if (p >= s.data_end) s.end_transfer_func();
};
Bh.prototype.data_readw = function(fa) {
    var s = this.cur_drive;
    var p, Mg, th;
    if (!s) {
        Mg = 0;
    } else {
        p = s.data_index;
        th = s.io_buffer;
        Mg = th[p] | (th[p + 1] << 8);
        p += 2;
        s.data_index = p;
        if (p >= s.data_end) s.end_transfer_func();
    }
    return Mg;
};
Bh.prototype.data_writel = function(fa, ga) {
    var s = this.cur_drive;
    var p, th;
    if (!s) return;
    p = s.data_index;
    th = s.io_buffer;
    th[p] = ga & 0xff;
    th[p + 1] = (ga >> 8) & 0xff;
    th[p + 2] = (ga >> 16) & 0xff;
    th[p + 3] = (ga >> 24) & 0xff;
    p += 4;
    s.data_index = p;
    if (p >= s.data_end) s.end_transfer_func();
};
Bh.prototype.data_readl = function(fa) {
    var s = this.cur_drive;
    var p, Mg, th;
    if (!s) {
        Mg = 0;
    } else {
        p = s.data_index;
        th = s.io_buffer;
        Mg = th[p] | (th[p + 1] << 8) | (th[p + 2] << 16) | (th[p + 3] << 24);
        p += 4;
        s.data_index = p;
        if (p >= s.data_end) s.end_transfer_func();
    }
    return Mg;
};
function qh(Dh, Eh) {
    var Fh, Gh;
    this.ide_if = Dh;
    this.bs = Eh;
    Gh = Eh.get_sector_count();
    Fh = Gh / (16 * 63);
    if (Fh > 16383) Fh = 16383;
    else if (Fh < 2) Fh = 2;
    this.cylinders = Fh;
    this.heads = 16;
    this.sectors = 63;
    this.nb_sectors = Gh;
    this.mult_sectors = 128;
    this.feature = 0;
    this.error = 0;
    this.nsector = 0;
    this.sector = 0;
    this.lcyl = 0;
    this.hcyl = 0;
    this.select = 0xa0;
    this.status = 0x40 | 0x10;
    this.cmd = 0;
    this.io_buffer = Ig(128 * 512 + 4);
    this.data_index = 0;
    this.data_end = 0;
    this.end_transfer_func = this.transfer_stop.bind(this);
    this.req_nb_sectors = 0;
    this.io_nb_sectors = 0;
}
function Bh(Kg, fa, Hh, hh, Ih) {
    var i, Jh;
    this.set_irq_func = hh;
    this.drives = [];
    for (i = 0; i < 2; i++) {
        if (Ih[i]) {
            Jh = new qh(this, Ih[i]);
        } else {
            Jh = null;
        }
        this.drives[i] = Jh;
    }
    this.cur_drive = this.drives[0];
    Kg.register_ioport_write(fa, 8, 1, this.ioport_write.bind(this));
    Kg.register_ioport_read(fa, 8, 1, this.ioport_read.bind(this));
    if (Hh) {
        Kg.register_ioport_read(Hh, 1, 1, this.status_read.bind(this));
        Kg.register_ioport_write(Hh, 1, 1, this.cmd_write.bind(this));
    }
    Kg.register_ioport_write(fa, 2, 2, this.data_writew.bind(this));
    Kg.register_ioport_read(fa, 2, 2, this.data_readw.bind(this));
    Kg.register_ioport_write(fa, 4, 4, this.data_writel.bind(this));
    Kg.register_ioport_read(fa, 4, 4, this.data_readl.bind(this));
}
function Kh(Dg, Lh, Mh) {
    if (Dg.indexOf("%d") < 0) throw "Invalid URL";
    if (Mh <= 0 || Lh <= 0) throw "Invalid parameters";
    this.block_sectors = Lh * 2;
    this.nb_sectors = this.block_sectors * Mh;
    this.url = Dg;
    this.max_cache_size = Math.max(1, Math.ceil(2536 / Lh));
    this.cache = new Array();
    this.sector_num = 0;
    this.sector_index = 0;
    this.sector_count = 0;
    this.sector_buf = null;
    this.sector_cb = null;
}
Kh.prototype.get_sector_count = function() {
    return this.nb_sectors;
};
Kh.prototype.get_time = function() {
    return + new Date();
};
Kh.prototype.get_cached_block = function(Nh) {
    var Oh, i, Ph = this.cache;
    for (i = 0; i < Ph.length; i++) {
        Oh = Ph[i];
        if (Oh.block_num == Nh) return Oh;
    }
    return null;
};
Kh.prototype.new_cached_block = function(Nh) {
    var Oh, Qh, i, j, Rh, Ph = this.cache;
    Oh = new Object();
    Oh.block_num = Nh;
    Oh.time = this.get_time();
    if (Ph.length < this.max_cache_size) {
        j = Ph.length;
    } else {
        for (i = 0; i < Ph.length; i++) {
            Qh = Ph[i];
            if (i == 0 || Qh.time < Rh) {
                Rh = Qh.time;
                j = i;
            }
        }
    }
    Ph[j] = Oh;
    return Oh;
};
Kh.prototype.get_url = function(Dg, Nh) {
    var p, s;
    s = Nh.toString();
    while (s.length < 9) s = "0" + s;
    p = Dg.indexOf("%d");
    return Dg.substr(0, p) + s + Dg.substring(p + 2, Dg.length);
};
Kh.prototype.read_async_cb = function(Sh) {
    var Nh, l, ue, Oh, i, Th, Uh, Vh, Wh;
    var Xh, Dg;
    while (this.sector_index < this.sector_count) {
        Nh = Math.floor(this.sector_num / this.block_sectors);
        Oh = this.get_cached_block(Nh);
        if (Oh) {
            ue = this.sector_num - Nh * this.block_sectors;
            l = Math.min(this.sector_count - this.sector_index, this.block_sectors - ue);
            Th = l * 512;
            Uh = this.sector_buf;
            Vh = this.sector_index * 512;
            Wh = Oh.buf;
            Xh = ue * 512;
            for (i = 0; i < Th; i++) {
                Uh[i + Vh] = Wh[i + Xh];
            }
            this.sector_index += l;
            this.sector_num += l;
        } else {
            Dg = this.get_url(this.url, Nh);
            load_binary(Dg, this.read_async_cb2.bind(this));
            return;
        }
    }
    this.sector_buf = null;
    if (!Sh) {
        this.sector_cb(0);
    }
};
Kh.prototype.add_block = function(Nh, Gg, ng) {
    var Oh, Yh, i;
    Oh = this.new_cached_block(Nh);
    Yh = Oh.buf = Ig(this.block_sectors * 512);
    if (typeof Gg == "string") {
        for (i = 0; i < ng; i++) Yh[i] = Gg.charCodeAt(i) & 0xff;
    } else {
        for (i = 0; i < ng; i++) Yh[i] = Gg[i];
    }
};
Kh.prototype.read_async_cb2 = function(Gg, ng) {
    var Nh;
    if (ng < 0 || ng != (this.block_sectors * 512)) {
        this.sector_cb( - 1);
    } else {
        Nh = Math.floor(this.sector_num / this.block_sectors);
        this.add_block(Nh, Gg, ng);
        this.read_async_cb(false);
    }
};
Kh.prototype.read_async = function(yh, Yh, n, Zh) {
    if ((yh + n) > this.nb_sectors) return - 1;
    this.sector_num = yh;
    this.sector_buf = Yh;
    this.sector_index = 0;
    this.sector_count = n;
    this.sector_cb = Zh;
    this.read_async_cb(true);
    if (this.sector_index >= this.sector_count) {
        return 0;
    } else {
        return 1;
    }
};
Kh.prototype.preload = function(th, Eg) {
    var i, Dg, Nh;
    if (th.length == 0) {
        setTimeout(Eg, 0);
    } else {
        this.preload_cb2 = Eg;
        this.preload_count = th.length;
        for (i = 0; i < th.length; i++) {
            Nh = th[i];
            Dg = this.get_url(this.url, Nh);
            load_binary(Dg, this.preload_cb.bind(this, Nh));
        }
    }
};
Kh.prototype.preload_cb = function(Nh, Gg, ng) {
    if (ng < 0) {} else {
        this.add_block(Nh, Gg, ng);
        this.preload_count--;
        if (this.preload_count == 0) {
            this.preload_cb2(0);
        }
    }
};
Kh.prototype.write_async = function(yh, Yh, n, Zh) {
    return - 1;
};
ai.prototype.reset = function() {
    this.isr = 0x80;
};
ai.prototype.update_irq = function() {
    var bi;
    bi = (this.isr & this.imr) & 0x7f;
    if (bi) this.set_irq_func(1);
    else this.set_irq_func(0);
};
ai.prototype.compute_mcast_idx = function(ci) {
    var di, ac, i, j, b;
    di = -1;
    for (i = 0; i < 6; i++) {
        b = ci[i];
        for (j = 0; j < 8; j++) {
            ac = (di >>> 31) ^ (b & 0x01);
            di <<= 1;
            b >>= 1;
            if (ac) di = (di ^ 0x04c11db6) | ac;
        }
    }
    return di >>> 26;
};
ai.prototype.buffer_full = function() {
    var ei, Rb, fi;
    Rb = this.curpag << 8;
    fi = this.boundary << 8;
    if (Rb < fi) ei = fi - Rb;
    else ei = (this.stop - this.start) - (Rb - fi);
    return (ei < (1514 + 4));
};
ai.prototype.receive_packet = function(Yh) {
    var gi, hi, ng, Rb, ii, wh, ji, fa;
    var ki, i;
    wh = Yh.length;
    if (this.cmd & 0x01 || this.buffer_full() || wh < 6) return;
    if (this.rxcr & 0x10) {} else {
        if (Yh[0] == 0xff && Yh[1] == 0xff && Yh[2] == 0xff && Yh[3] == 0xff && Yh[4] == 0xff && Yh[5] == 0xff) {
            if (! (this.rxcr & 0x04)) return;
        } else if (Yh[0] & 0x01) {
            if (! (this.rxcr & 0x08)) return;
            ii = li(Yh);
            if (! (this.mult[ii >> 3] & (1 << (ii & 7)))) return;
        } else if (this.phys[0] == Yh[0] && this.phys[1] == Yh[1] && this.phys[2] == Yh[2] && this.phys[3] == Yh[3] && this.phys[4] == Yh[4] && this.phys[5] == Yh[5]) {} else {
            return;
        }
    }
    if (wh < 60) wh = 60;
    Rb = this.curpag << 8;
    ji = this.mem;
    gi = wh + 4;
    hi = Rb + ((gi + 4 + 255) & ~0xff);
    if (hi >= this.stop) hi -= (this.stop - this.start);
    this.rsr = 0x01;
    if (Yh[0] & 0x01) this.rsr |= 0x20;
    fa = Rb & 0x7fff;
    if (fa >= 0x4000) {
        ji[fa] = this.rsr & 0xff;
        ji[fa + 1] = (hi >> 8) & 0xff;
        ji[fa + 2] = gi & 0xff;
        ji[fa + 3] = (gi >> 8) & 0xff;
    }
    Rb += 4;
    while (wh > 0) {
        if (Rb >= this.stop) break;
        ng = Math.min(wh, this.stop - Rb);
        if (ki < Yh.length) ng = Math.min(ng, Yh.length - ki);
        ng = Math.min(ng, 0x4000 - (Rb & 0x3fff));
        fa = Rb & 0x7fff;
        if (fa >= 0x4000) {
            if (ki < Yh.length) {
                for (i = 0; i < ng; i++) ji[fa + i] = Yh[ki + i];
            } else {
                for (i = 0; i < ng; i++) ji[fa + i] = 0;
            }
        }
        ki += ng;
        Rb += ng;
        if (Rb == this.stop) Rb = this.start;
        wh -= ng;
    }
    this.curpag = hi >> 8;
    this.isr |= 0x01;
    this.update_irq();
};
ai.prototype.send_packet = function() {
    var Rb;
    Rb = (this.tpsr << 8) & 0x7fff;
    if (Rb + this.tcnt <= (32 * 1024)) {
        this.send_packet_func(this.mem, Rb, this.tcnt);
    }
    this.tsr = 0x01;
    this.isr |= 0x02;
    this.cmd &= ~0x04;
    this.update_irq();
};
ai.prototype.ioport_write = function(fa, ga) {
    var ue, mi;
    fa &= 0xf;
    if (fa == 0x00) {
        this.cmd = ga;
        if (! (ga & 0x01)) {
            this.isr &= ~0x80;
            if ((ga & (0x08 | 0x10)) && this.rcnt == 0) {
                this.isr |= 0x40;
                this.update_irq();
            }
            if (ga & 0x04) {
                this.send_packet();
            }
        }
    } else {
        mi = this.cmd >> 6;
        ue = fa | (mi << 4);
        switch (ue) {
        case 0x01:
            this.start = ga << 8;
            break;
        case 0x02:
            this.stop = ga << 8;
            break;
        case 0x03:
            this.boundary = ga;
            break;
        case 0x0f:
            this.imr = ga;
            this.update_irq();
            break;
        case 0x04:
            this.tpsr = ga;
            break;
        case 0x05:
            this.tcnt = (this.tcnt & 0xff00) | ga;
            break;
        case 0x06:
            this.tcnt = (this.tcnt & 0x00ff) | (ga << 8);
            break;
        case 0x08:
            this.rsar = (this.rsar & 0xff00) | ga;
            break;
        case 0x09:
            this.rsar = (this.rsar & 0x00ff) | (ga << 8);
            break;
        case 0x0a:
            this.rcnt = (this.rcnt & 0xff00) | ga;
            break;
        case 0x0b:
            this.rcnt = (this.rcnt & 0x00ff) | (ga << 8);
            break;
        case 0x0c:
            this.rxcr = ga;
            break;
        case 0x0e:
            this.dcfg = ga;
            break;
        case 0x07:
            this.isr &= ~ (ga & 0x7f);
            this.update_irq();
            break;
        case 0x11:
        case 0x11 + 1 : case 0x11 + 2 : case 0x11 + 3 : case 0x11 + 4 : case 0x11 + 5 : this.phys[ue - 0x11] = ga;
            break;
        case 0x17:
            this.curpag = ga;
            break;
        case 0x18:
        case 0x18 + 1 : case 0x18 + 2 : case 0x18 + 3 : case 0x18 + 4 : case 0x18 + 5 : case 0x18 + 6 : case 0x18 + 7 : this.mult[ue - 0x18] = ga;
            break;
        }
    }
};
ai.prototype.ioport_read = function(fa) {
    var ue, mi, Mg;
    fa &= 0xf;
    if (fa == 0x00) {
        Mg = this.cmd;
    } else {
        mi = this.cmd >> 6;
        ue = fa | (mi << 4);
        switch (ue) {
        case 0x04:
            Mg = this.tsr;
            break;
        case 0x03:
            Mg = this.boundary;
            break;
        case 0x07:
            Mg = this.isr;
            break;
        case 0x08:
            Mg = this.rsar & 0x00ff;
            break;
        case 0x09:
            Mg = this.rsar >> 8;
            break;
        case 0x11:
        case 0x11 + 1 : case 0x11 + 2 : case 0x11 + 3 : case 0x11 + 4 : case 0x11 + 5 : Mg = this.phys[ue - 0x11];
            break;
        case 0x17:
            Mg = this.curpag;
            break;
        case 0x18:
        case 0x18 + 1 : case 0x18 + 2 : case 0x18 + 3 : case 0x18 + 4 : case 0x18 + 5 : case 0x18 + 6 : case 0x18 + 7 : Mg = this.mult[ue - 0x18];
            break;
        case 0x0c:
            Mg = this.rsr;
            break;
        case 0x21:
            Mg = this.start >> 8;
            break;
        case 0x22:
            Mg = this.stop >> 8;
            break;
        case 0x0a:
            Mg = 0x50;
            break;
        case 0x0b:
            Mg = 0x43;
            break;
        case 0x33:
            Mg = 0;
            break;
        case 0x35:
            Mg = 0x40;
            break;
        case 0x36:
            Mg = 0x40;
            break;
        default:
            Mg = 0x00;
            break;
        }
    }
    return Mg;
};
ai.prototype.dma_update = function(ng) {
    this.rsar += ng;
    if (this.rsar == this.stop) this.rsar = this.start;
    if (this.rcnt <= ng) {
        this.rcnt = 0;
        this.isr |= 0x40;
        this.update_irq();
    } else {
        this.rcnt -= ng;
    }
};
ai.prototype.asic_ioport_write = function(fa, ga) {
    var fa;
    if (this.rcnt == 0) return;
    if (this.dcfg & 0x01) {
        fa = (this.rsar & ~1) & 0x7fff;
        if (fa >= 0x4000) {
            this.mem[fa] = ga & 0xff;
            this.mem[fa + 1] = (ga >> 8) & 0xff;
        }
        this.dma_update(2);
    } else {
        fa = this.rsar & 0x7fff;
        if (fa >= 0x4000) {
            this.mem[fa] = ga & 0xff;
        }
        this.dma_update(1);
    }
};
ai.prototype.asic_ioport_read = function(fa) {
    var fa, Mg;
    if (this.dcfg & 0x01) {
        fa = (this.rsar & ~1) & 0x7fff;
        Mg = this.mem[fa] | (this.mem[fa + 1] << 8);
        this.dma_update(2);
    } else {
        fa = this.rsar & 0x7fff;
        Mg = this.mem[fa];
        this.dma_update(1);
    }
    return Mg;
};
ai.prototype.asic_ioport_writel = function(fa, ga) {
    var fa;
    if (this.rcnt == 0) return;
    fa = (this.rsar & ~1) & 0x7fff;
    if (fa >= 0x4000) {
        this.mem[fa] = ga & 0xff;
        this.mem[fa + 1] = (ga >> 8) & 0xff;
    }
    fa = (fa + 2) & 0x7fff;
    if (fa >= 0x4000) {
        this.mem[fa] = (ga >> 16) & 0xff;
        this.mem[fa + 1] = (ga >> 24) & 0xff;
    }
    this.dma_update(4);
};
ai.prototype.asic_ioport_readl = function(fa) {
    var fa, Mg;
    fa = (this.rsar & ~1) & 0x7fff;
    Mg = this.mem[fa] | (this.mem[fa + 1] << 8);
    fa = (fa + 2) & 0x7fff;
    Mg |= (this.mem[fa] << 16) | (this.mem[fa + 1] << 24);
    this.dma_update(4);
    return Mg;
};
ai.prototype.reset_ioport_write = function(fa, ga) {};
ai.prototype.reset_ioport_read = function(fa) {
    this.reset();
};
function ai(Kg, base, hh, ni, oi) {
    var i;
    this.set_irq_func = hh;
    this.send_packet_func = oi;
    Kg.register_ioport_write(base, 16, 1, this.ioport_write.bind(this));
    Kg.register_ioport_read(base, 16, 1, this.ioport_read.bind(this));
    Kg.register_ioport_write(base + 0x10, 1, 1, this.asic_ioport_write.bind(this));
    Kg.register_ioport_read(base + 0x10, 1, 1, this.asic_ioport_read.bind(this));
    Kg.register_ioport_write(base + 0x10, 2, 2, this.asic_ioport_write.bind(this));
    Kg.register_ioport_read(base + 0x10, 2, 2, this.asic_ioport_read.bind(this));
    Kg.register_ioport_write(base + 0x1f, 1, 1, this.reset_ioport_write.bind(this));
    Kg.register_ioport_read(base + 0x1f, 1, 1, this.reset_ioport_read.bind(this));
    this.cmd = 0;
    this.start = 0;
    this.stop = 0;
    this.boundary = 0;
    this.tsr = 0;
    this.tpsr = 0;
    this.tcnt = 0;
    this.rcnt = 0;
    this.rsar = 0;
    this.rsr = 0;
    this.rxcr = 0;
    this.isr = 0;
    this.dcfg = 0;
    this.imr = 0;
    this.phys = Ig(6);
    this.curpag = 0;
    this.mult = Ig(8);
    this.mem = Ig((32 * 1024));
    for (i = 0; i < 6; i++) this.mem[i] = ni[i];
    this.mem[14] = 0x57;
    this.mem[15] = 0x57;
    for (i = 15; i >= 0; i--) {
        this.mem[2 * i] = this.mem[i];
        this.mem[2 * i + 1] = this.mem[i];
    }
    this.reset();
}
function pi(Yh, Rb, ng) {
    console.log("send packet len=" + ng);
}
function Ug(Mf) {
    this.hard_irq = Mf;
}
function qi() {
    return this.cycle_count;
}
function PCEmulator(ri) {
    var wa, si, ti, i, p;
    wa = new CPU_X86();
    this.cpu = wa;
    wa.phys_mem_resize(ri.mem_size);
    this.init_ioports();
    this.register_ioport_write(0x80, 1, 1, this.ioport80_write);
    this.pic = new Sg(this, 0x20, 0xa0, Ug.bind(wa));
    this.pit = new Wg(this, this.pic.set_irq.bind(this.pic, 0), qi.bind(wa));
    this.cmos = new Jg(this);
    this.serial = new gh(this, 0x3f8, this.pic.set_irq.bind(this.pic, 4), ri.serial_write);
    this.kbd = new lh(this, this.reset.bind(this));
    this.reset_request = 0;
    ti = ["hda", "hdb"];
    si = new Array();
    for (i = 0; i < ti.length; i++) {
        p = ri[ti[i]];
        si[i] = null;
        if (p) {
            si[i] = new Kh(p.url, p.block_size, p.nb_blocks);
        }
    }
    this.ide0 = new Bh(this, 0x1f0, 0x3f6, this.pic.set_irq.bind(this.pic, 14), si);
    this.net0 = new ai(this, 0x300, this.pic.set_irq.bind(this.pic, 9), [0xaa, 0xaa, 0xaa, 0xaa, 0xaa, 0xaa], pi);
    if (ri.clipboard_get && ri.clipboard_set) {
        this.jsclipboard = new nh(this, 0x3c0, ri.clipboard_get, ri.clipboard_set, ri.get_boot_time);
    }
    wa.ld8_port = this.ld8_port.bind(this);
    wa.ld16_port = this.ld16_port.bind(this);
    wa.ld32_port = this.ld32_port.bind(this);
    wa.st8_port = this.st8_port.bind(this);
    wa.st16_port = this.st16_port.bind(this);
    wa.st32_port = this.st32_port.bind(this);
    wa.get_hard_intno = this.pic.get_hard_intno.bind(this.pic);
}
PCEmulator.prototype.load_binary = function(Dg, ha, Eg) {
    return this.cpu.load_binary(Dg, ha, Eg);
};
PCEmulator.prototype.start = function() {
    setTimeout(this.timer_func.bind(this), 10);
};
PCEmulator.prototype.timer_func = function() {
    var La, ui, vi, wi, xi, Kg, wa;
    Kg = this;
    wa = Kg.cpu;
    vi = wa.cycle_count + 100000;
    wi = false;
    xi = false;
    yi: while (wa.cycle_count < vi) {
        Kg.serial.write_tx_fifo();
        Kg.pit.update_irq();
        La = wa.exec(vi - wa.cycle_count);
        if (La == 256) {
            if (Kg.reset_request) {
                wi = true;
                break;
            }
        } else if (La == 257) {
            xi = true;
            break;
        } else {
            wi = true;
            break;
        }
    }
    if (!wi) {
        if (xi) {
            setTimeout(this.timer_func.bind(this), 10);
        } else {
            setTimeout(this.timer_func.bind(this), 0);
        }
    }
};
PCEmulator.prototype.init_ioports = function() {
    var i, zi, Ai;
    this.ioport_readb_table = new Array();
    this.ioport_writeb_table = new Array();
    this.ioport_readw_table = new Array();
    this.ioport_writew_table = new Array();
    this.ioport_readl_table = new Array();
    this.ioport_writel_table = new Array();
    zi = this.default_ioport_readw.bind(this);
    Ai = this.default_ioport_writew.bind(this);
    for (i = 0; i < 1024; i++) {
        this.ioport_readb_table[i] = this.default_ioport_readb;
        this.ioport_writeb_table[i] = this.default_ioport_writeb;
        this.ioport_readw_table[i] = zi;
        this.ioport_writew_table[i] = Ai;
        this.ioport_readl_table[i] = this.default_ioport_readl;
        this.ioport_writel_table[i] = this.default_ioport_writel;
    }
};
PCEmulator.prototype.default_ioport_readb = function(Vf) {
    var ga;
    ga = 0xff;
    return ga;
};
PCEmulator.prototype.default_ioport_readw = function(Vf) {
    var ga;
    ga = this.ioport_readb_table[Vf](Vf);
    Vf = (Vf + 1) & (1024 - 1);
    ga |= this.ioport_readb_table[Vf](Vf) << 8;
    return ga;
};
PCEmulator.prototype.default_ioport_readl = function(Vf) {
    var ga;
    ga = -1;
    return ga;
};
PCEmulator.prototype.default_ioport_writeb = function(Vf, ga) {};
PCEmulator.prototype.default_ioport_writew = function(Vf, ga) {
    this.ioport_writeb_table[Vf](Vf, ga & 0xff);
    Vf = (Vf + 1) & (1024 - 1);
    this.ioport_writeb_table[Vf](Vf, (ga >> 8) & 0xff);
};
PCEmulator.prototype.default_ioport_writel = function(Vf, ga) {};
PCEmulator.prototype.ld8_port = function(Vf) {
    var ga;
    ga = this.ioport_readb_table[Vf & (1024 - 1)](Vf);
    return ga;
};
PCEmulator.prototype.ld16_port = function(Vf) {
    var ga;
    ga = this.ioport_readw_table[Vf & (1024 - 1)](Vf);
    return ga;
};
PCEmulator.prototype.ld32_port = function(Vf) {
    var ga;
    ga = this.ioport_readl_table[Vf & (1024 - 1)](Vf);
    return ga;
};
PCEmulator.prototype.st8_port = function(Vf, ga) {
    this.ioport_writeb_table[Vf & (1024 - 1)](Vf, ga);
};
PCEmulator.prototype.st16_port = function(Vf, ga) {
    this.ioport_writew_table[Vf & (1024 - 1)](Vf, ga);
};
PCEmulator.prototype.st32_port = function(Vf, ga) {
    this.ioport_writel_table[Vf & (1024 - 1)](Vf, ga);
};
PCEmulator.prototype.register_ioport_read = function(start, ng, wh, Ah) {
    var i;
    switch (wh) {
    case 1:
        for (i = start; i < start + ng; i++) {
            this.ioport_readb_table[i] = Ah;
        }
        break;
    case 2:
        for (i = start; i < start + ng; i += 2) {
            this.ioport_readw_table[i] = Ah;
        }
        break;
    case 4:
        for (i = start; i < start + ng; i += 4) {
            this.ioport_readl_table[i] = Ah;
        }
        break;
    }
};
PCEmulator.prototype.register_ioport_write = function(start, ng, wh, Ah) {
    var i;
    switch (wh) {
    case 1:
        for (i = start; i < start + ng; i++) {
            this.ioport_writeb_table[i] = Ah;
        }
        break;
    case 2:
        for (i = start; i < start + ng; i += 2) {
            this.ioport_writew_table[i] = Ah;
        }
        break;
    case 4:
        for (i = start; i < start + ng; i += 4) {
            this.ioport_writel_table[i] = Ah;
        }
        break;
    }
};
PCEmulator.prototype.ioport80_write = function(fa, Gg) {};
PCEmulator.prototype.reset = function() {
    this.reset_request = 1;
};