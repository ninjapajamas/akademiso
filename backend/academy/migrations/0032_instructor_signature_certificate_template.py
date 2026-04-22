from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0031_quiz_question_answer_types'),
    ]

    operations = [
        migrations.AddField(
            model_name='instructor',
            name='signature_image',
            field=models.ImageField(blank=True, null=True, upload_to='instructor_signatures/'),
        ),
        migrations.AddField(
            model_name='certificate',
            name='template',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='certificates', to='academy.certificatetemplate'),
        ),
    ]
