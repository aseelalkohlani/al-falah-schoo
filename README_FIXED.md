# منصة نتائج الطلاب - الإصدار الثابت للشهادة نصف A4

هذه الحزمة تحتوي على مشروع كامل لإدارة نتائج الطلاب والاستعلام العام، مع تصميم شهادة ثابت الحجم تقريبًا:

- العرض: `400pt`
- الارتفاع: `250pt`
- جدول الدرجات أفقي
- رفع مستقل للشعارات والتواقيع والختم
- شريط ذهبي متحرك أعلى واجهة الاستعلام

## الملفات

```text
index.html
script.js
viewer.html
styles.css
README_FIXED.md
setup_supabase.sql
```

## بيانات دخول الإدارة الافتراضية

```text
Username: Admin
Password: 12345
```

يمكن تغييرها من أعلى ملف `script.js`:

```js
const LOGIN_USER = "Admin";
const LOGIN_PASS = "12345";
```

## خطوات التشغيل من البداية

### 1) إنشاء مشروع Supabase

أنشئ مشروعًا جديدًا في Supabase بأي اسم مناسب، مثل:

```text
StudentResultsPlatform
```

### 2) تنفيذ SQL

افتح:

```text
Supabase Dashboard → SQL Editor → New query
```

ثم انسخ كامل محتوى ملف:

```text
setup_supabase.sql
```

واضغط `Run`.

سيتم إنشاء:

```text
students_results
school_settings
grade_templates
uploaded_files
student-results-assets bucket
```

### 3) إضافة بيانات Supabase داخل script.js

بعد تنفيذ SQL، انسخ من Supabase:

```text
Project URL
anon/public key
```

ثم ضعها في أعلى ملف `script.js` بدل:

```js
const SUPABASE_URL = "PUT_SUPABASE_URL_HERE";
const SUPABASE_ANON_KEY = "PUT_SUPABASE_ANON_PUBLIC_KEY_HERE";
```

### 4) رفع الملفات على Netlify

ارفع هذه الملفات فقط إلى Netlify:

```text
index.html
script.js
viewer.html
styles.css
README_FIXED.md
```

لا ترفع `setup_supabase.sql` إلى Netlify بعد تنفيذه في Supabase.

## واجهة الإدارة

من `index.html` يمكنك:

- رفع ملف Excel للنتائج.
- حفظ بيانات المدرسة.
- رفع شعار المدرسة جهة اليمين.
- رفع الشعار المقابل جهة اليسار.
- رفع توقيع الكنترول.
- رفع توقيع مدير المدرسة.
- رفع ختم الكنترول/المدرسة.
- رفع قالب HTML خاص لكل صف عند الحاجة.
- حذف جميع النتائج القديمة.

## واجهة الاستعلام

من `viewer.html` يستطيع الطالب أو ولي الأمر الاستعلام باستخدام:

```text
اسم الطالب + الصف
```

ويمكن إدخال الرقم المدرسي عند تشابه الأسماء.

تظهر النتيجة في شهادة ثابتة الحجم مع جدول أفقي، ويمكن تحميلها:

- صورة PNG
- PDF

## شريط التصميم الذهبي

يظهر أعلى صفحة الاستعلام نص متحرك:

```text
تصميم المهند عيسى الكحلاني للتواصل/ +967 772 674 795
```

يمكن تعديل النص من ملف `viewer.html` داخل عنصر:

```html
<div class="gold-marquee">
```

## ملاحظات أمنية

هذه النسخة عملية وسهلة التشغيل على Netlify + Supabase مباشرة. لأنها تستخدم `anon public key` من المتصفح، فهي مناسبة للتشغيل السريع والعرض العملي. للنسخة الإنتاجية الرسمية يفضّل لاحقًا إضافة Auth أو Backend/API لتقييد عمليات الرفع والحذف.
