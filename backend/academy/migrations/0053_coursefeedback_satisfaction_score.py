from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0052_course_certificate_requirements'),
    ]

    operations = [
        migrations.AddField(
            model_name='coursefeedback',
            name='satisfaction_score',
            field=models.PositiveSmallIntegerField(blank=True, null=True),
        ),
    ]
