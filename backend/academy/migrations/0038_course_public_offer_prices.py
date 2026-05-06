from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0037_cartitem_offer_fields'),
    ]

    operations = [
        migrations.AddField(
            model_name='course',
            name='public_offline_discount_price',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='course',
            name='public_offline_price',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='course',
            name='public_online_discount_price',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
        migrations.AddField(
            model_name='course',
            name='public_online_price',
            field=models.DecimalField(blank=True, decimal_places=2, max_digits=10, null=True),
        ),
    ]
