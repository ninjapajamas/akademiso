from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0033_coursediscussiontopic_coursediscussioncomment'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='offer_mode',
            field=models.CharField(blank=True, default='', max_length=20),
        ),
        migrations.AddField(
            model_name='order',
            name='offer_type',
            field=models.CharField(choices=[('elearning', 'E-Learning'), ('public', 'Public Training')], default='elearning', max_length=20),
        ),
        migrations.AddField(
            model_name='order',
            name='public_session_id',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
    ]
