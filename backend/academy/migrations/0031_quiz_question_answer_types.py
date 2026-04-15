# Generated manually to support lesson quiz question variants.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0030_order_platform_fee_split'),
    ]

    operations = [
        migrations.AddField(
            model_name='question',
            name='question_type',
            field=models.CharField(
                choices=[
                    ('MC', 'Pilihan Ganda'),
                    ('SHORT_ANSWER', 'Isian Singkat'),
                ],
                default='MC',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='question',
            name='correct_answer',
            field=models.TextField(blank=True, default=''),
        ),
    ]
