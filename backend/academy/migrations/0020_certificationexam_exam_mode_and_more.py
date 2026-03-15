from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0019_certificatetemplate'),
    ]

    operations = [
        migrations.AddField(
            model_name='certificationexam',
            name='exam_mode',
            field=models.CharField(
                choices=[
                    ('QUESTIONS_ONLY', 'Soal Saja'),
                    ('INTERVIEW_ONLY', 'Wawancara Saja'),
                    ('HYBRID', 'Soal + Wawancara'),
                ],
                default='QUESTIONS_ONLY',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='certificationexam',
            name='tested_materials',
            field=models.TextField(blank=True, default=''),
        ),
    ]
