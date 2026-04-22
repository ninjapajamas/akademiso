from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0034_order_offer_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='lesson',
            name='attachment',
            field=models.FileField(blank=True, null=True, upload_to='lesson_attachments/'),
        ),
    ]
