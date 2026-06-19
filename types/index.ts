// Tipos para o sistema

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'teacher' | 'student';
  created_at: string;
}

export interface Module {
  id: string;
  title: string;
  description: string;
  price: number;
  teacher_id: string;
  is_free: boolean;
  free_lesson_url: string | null;
  lessons: Lesson[];
  lessons_count: number;
  created_at: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  title: string;
  youtube_url: string;
  description: string;
  is_free_preview: boolean;
  order_number: number;
  created_at: string;
}

export interface Purchase {
  id: string;
  student_id: string;
  module_id: string;
  payment_id: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface LiveRoom {
  id: string;
  teacher_id: string;
  title: string;
  description: string;
  module_id: string | null;
  room_code: string;
  peer_id: string;
  status: 'active' | 'finished';
  teacher_name?: string;
  teacher_email?: string;
  module_title?: string;
  created_at: string;
}

export interface LiveClass {
  id: string;
  teacher_id: string;
  title: string;
  description: string;
  module_id: string | null;
  start_time: string;
  end_time: string | null;
  meeting_url: string | null;
  status: 'scheduled' | 'ongoing' | 'finished';
  created_at: string;
}