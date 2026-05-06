from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0040_coursefeedback'),
    ]

    operations = [
        migrations.AddField(
            model_name='coursediscussioncomment',
            name='attachment',
            field=models.FileField(blank=True, null=True, upload_to='discussion_attachments/comments/'),
        ),
        migrations.AddField(
            model_name='coursediscussiontopic',
            name='attachment',
            field=models.FileField(blank=True, null=True, upload_to='discussion_attachments/topics/'),
        ),
    ]
