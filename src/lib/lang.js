import { createContext, useContext, useMemo } from 'react'

const T = {
  en: {
    title: 'Squishy Simulator',
    invisible_hand: 'Invisible Hand',
    poke: 'Poke', squeeze: 'Squeeze', palm: 'Palm',
    taps: 'Taps', knead: 'Knead', pancake: 'Pancake',
    create_btn: '＋ Create Your Squishy',
    clear_custom: n => `Clear custom squishies (${n})`,
    wax: 'Wax', waxed: 'Waxed!',
    community: 'Community',
    // Creator modal
    create_title: 'Create Your Squishy',
    preset_shape: '🧸 Preset Shape',
    sculpt_studio: '🎨 Sculpt Studio',
    name_it: 'Name it',
    name_placeholder: 'My Squishy',
    rise_speed: 'Rise Speed',
    speed_slow: '🐌 Slooow', speed_slow_desc: '~4 sec',
    speed_normal: '😐 Normal', speed_normal_desc: '~2 sec',
    speed_bouncy: '🐇 Bouncy', speed_bouncy_desc: 'snap',
    shape: 'Shape', color: 'Color', face: '😊 Face',
    add_to_shelf: 'Add to Shelf 🧸',
    face_smile: 'Smile', face_cry: 'Cry', face_dead: 'Dead',
    face_openmouth: 'Open', face_none: 'None',
    // Studio tools
    sculpt_tool: 'Sculpt', paint_tool: 'Paint', text_tool: 'Text',
    face_tool: 'Face', parts_tool: 'Parts',
    parts_label: 'Parts',
    brush_size: 'Brush Size',
    sculpt_hint: 'Drag UP to inflate · DOWN to indent · orbit to rotate',
    reset_shape: 'Reset Shape',
    paint_clear: 'Clear',
    text_on_squishy: 'Text on Squishy',
    text_placeholder: 'Write something cute...',
    face_on_piece: 'Face on Piece',
    piece_n: n => `Piece ${n}`,
    expression: 'Expression',
    rotate: 'Rotate', tilt: 'Tilt', fine_adjust: 'Fine Adjust',
    dir_front: 'Front', dir_right: 'Right', dir_back: 'Back', dir_left: 'Left',
    dir_bottom: 'Bottom', dir_middle: 'Middle', dir_top: 'Top',
    part_shape: 'Shape', part_color: 'Color', part_size: 'Size', part_pos: 'Position',
    add_part: '➕ Add Another Part',
    max_parts: n => `Max ${n} parts reached`,
    reset_size: 'Reset Size', reset_pos: 'Reset Pos',
    // Community
    just_now: 'just now',
    m_ago: n => `${n}m ago`,
    h_ago: n => `${n}h ago`,
    d_ago: n => `${n}d ago`,
    by: 'by',
    likes: 'Likes', plays: 'Plays',
    btn_play: '▶ Play', btn_liked: '❤️ Liked', btn_like: '🤍 Like', btn_share: '↗ Share',
    related_title: '✨ Related Squishies',
    share_title: 'Share to Community 🌍',
    choose_squishy: 'Choose a squishy',
    your_name: 'Your name',
    cancel: 'Cancel', sharing: 'Sharing…', share_btn: 'Share ✨',
    shared_title: 'Shared!',
    shared_msg: 'Your squishy is now in the community!',
    back_community: 'Back to Community',
    no_squishies_title: 'No squishies yet!',
    no_squishies_msg: 'Create a squishy first, then share it here.',
    got_it: 'Got it',
    lang_toggle: 'ไทย',
  },
  th: {
    title: 'สควิชชี่ซิมูเลเตอร์',
    invisible_hand: 'มือล่องหน',
    poke: 'จิ้ม', squeeze: 'บีบ', palm: 'ฝ่ามือ',
    taps: 'แตะ', knead: 'นวด', pancake: 'แบน',
    create_btn: '＋ สร้างสควิชชี่',
    clear_custom: n => `ล้างสควิชชี่ที่สร้าง (${n})`,
    wax: 'แว็กซ์', waxed: 'แว็กซ์แล้ว!',
    community: 'ชุมชน',
    create_title: 'สร้างสควิชชี่ของคุณ',
    preset_shape: '🧸 รูปร่างสำเร็จ',
    sculpt_studio: '🎨 ปั้นเอง',
    name_it: 'ตั้งชื่อ',
    name_placeholder: 'สควิชชี่ของฉัน',
    rise_speed: 'ความเร็ว',
    speed_slow: '🐌 ช้ามาก', speed_slow_desc: '~4 วิ',
    speed_normal: '😐 ปกติ', speed_normal_desc: '~2 วิ',
    speed_bouncy: '🐇 เด้งดึ๋ง', speed_bouncy_desc: 'พรวด',
    shape: 'รูปร่าง', color: 'สี', face: '😊 หน้า',
    add_to_shelf: 'ใส่ชั้นวาง 🧸',
    face_smile: 'ยิ้ม', face_cry: 'ร้องไห้', face_dead: 'ตาย',
    face_openmouth: 'อ้า', face_none: 'ไม่มี',
    sculpt_tool: 'ปั้น', paint_tool: 'ระบาย', text_tool: 'ข้อความ',
    face_tool: 'หน้า', parts_tool: 'ชิ้น',
    parts_label: 'ชิ้นส่วน',
    brush_size: 'ขนาดแปรง',
    sculpt_hint: 'ลากขึ้น=พอง · ลง=บุ๋ม · หมุนเพื่อดูรอบ',
    reset_shape: 'รีเซ็ตรูปร่าง',
    paint_clear: 'ล้าง',
    text_on_squishy: 'ข้อความบนสควิชชี่',
    text_placeholder: 'เขียนอะไรน่ารักๆ...',
    face_on_piece: 'หน้าบนชิ้น',
    piece_n: n => `ชิ้นที่ ${n}`,
    expression: 'สีหน้า',
    rotate: 'หมุน', tilt: 'เอียง', fine_adjust: 'ปรับละเอียด',
    dir_front: 'ด้านหน้า', dir_right: 'ขวา', dir_back: 'หลัง', dir_left: 'ซ้าย',
    dir_bottom: 'ล่าง', dir_middle: 'กลาง', dir_top: 'บน',
    part_shape: 'รูปร่าง', part_color: 'สี', part_size: 'ขนาด', part_pos: 'ตำแหน่ง',
    add_part: '➕ เพิ่มชิ้นส่วน',
    max_parts: n => `สูงสุด ${n} ชิ้นแล้ว`,
    reset_size: 'รีเซ็ตขนาด', reset_pos: 'รีเซ็ตตำแหน่ง',
    just_now: 'เมื่อกี้',
    m_ago: n => `${n} นาทีที่แล้ว`,
    h_ago: n => `${n} ชม.ที่แล้ว`,
    d_ago: n => `${n} วันที่แล้ว`,
    by: 'โดย',
    likes: 'ถูกใจ', plays: 'เล่น',
    btn_play: '▶ เล่น', btn_liked: '❤️ ถูกใจแล้ว', btn_like: '🤍 ถูกใจ', btn_share: '↗ แชร์',
    related_title: '✨ สควิชชี่ที่เกี่ยวข้อง',
    share_title: 'แชร์ไปชุมชน 🌍',
    choose_squishy: 'เลือกสควิชชี่',
    your_name: 'ชื่อของคุณ',
    cancel: 'ยกเลิก', sharing: 'กำลังแชร์…', share_btn: 'แชร์ ✨',
    shared_title: 'แชร์แล้ว!',
    shared_msg: 'สควิชชี่ของคุณอยู่ในชุมชนแล้ว!',
    back_community: 'กลับไปชุมชน',
    no_squishies_title: 'ยังไม่มีสควิชชี่!',
    no_squishies_msg: 'สร้างสควิชชี่ก่อน แล้วค่อยแชร์ที่นี่',
    got_it: 'โอเค',
    lang_toggle: 'EN',
  },
}

export const LangContext = createContext(null)

export function useLang() {
  const ctx = useContext(LangContext)
  if (!ctx) {
    const t = (key, ...args) => {
      const val = T.en[key] ?? key
      return typeof val === 'function' ? val(...args) : val
    }
    return { lang: 'en', t }
  }
  return ctx
}

export function makeTFunc(lang) {
  return function t(key, ...args) {
    const val = T[lang]?.[key] ?? T.en[key] ?? key
    return typeof val === 'function' ? val(...args) : val
  }
}

export function useMemoT(lang) {
  return useMemo(() => makeTFunc(lang), [lang])
}
