# -*- coding: utf-8 -*-

from odoo import api, fields, models


class ResPartner(models.Model):
    _inherit = "res.partner"

    birthday = fields.Date(string='DOB')

    @api.model
    def name_search(self, name='', domain=None, operator='ilike', limit=100):
        res = super().name_search(
            name=name,
            domain=domain,
            operator=operator,
            limit=limit
        )
        domain = domain or []
        if name:
            domain += [
                '|',
                ('name', operator, name),
                ('phone', operator, name),
            ]

        partners = self.search(domain, limit=limit)
        return [(partner.id, partner.display_name) for partner in partners]