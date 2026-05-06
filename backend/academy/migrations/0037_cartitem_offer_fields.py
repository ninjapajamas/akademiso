from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0036_alter_coursediscussioncomment_id_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='cartitem',
            name='offer_mode',
            field=models.CharField(blank=True, default='', max_length=20),
        ),
        migrations.AddField(
            model_name='cartitem',
            name='offer_type',
            field=models.CharField(choices=[('elearning', 'E-Learning'), ('public', 'Public Training')], default='elearning', max_length=20),
        ),
        migrations.AddField(
            model_name='cartitem',
            name='public_session_id',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AlterUniqueTogether(
            name='cartitem',
            unique_together={('cart', 'course', 'offer_type', 'offer_mode', 'public_session_id')},
        ),
    ]
