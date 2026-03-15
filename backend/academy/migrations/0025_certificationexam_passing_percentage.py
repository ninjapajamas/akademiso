from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0024_webinarattendance_profile_snapshot_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='certificationexam',
            name='passing_percentage',
            field=models.PositiveSmallIntegerField(
                default=70,
                help_text='Persentase minimal jawaban benar untuk dinyatakan lulus.',
                validators=[MinValueValidator(1), MaxValueValidator(100)],
            ),
        ),
    ]
