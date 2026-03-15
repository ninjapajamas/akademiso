from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0020_certificationexam_exam_mode_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='delivery_mode',
            field=models.CharField(blank=True, choices=[('online', 'Online'), ('offline', 'Offline')], max_length=20, null=True),
        ),
        migrations.AddField(
            model_name='course',
            name='is_free',
            field=models.BooleanField(default=False),
        ),
    ]
