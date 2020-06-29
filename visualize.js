const Field = require("@saltcorn/data/models/field");
const Table = require("@saltcorn/data/models/table");
const Form = require("@saltcorn/data/models/form");
const db = require("@saltcorn/data/db");
const Workflow = require("@saltcorn/data/models/workflow");

const {
  text,
  div,
  h3,
  style,
  a,
  script,
  pre,
  domReady,
  i
} = require("@saltcorn/markup/tags");

const configuration_workflow = () =>
  new Workflow({
    steps: [
      {
        name: "views",
        form: async context => {
          const table = await Table.findOne({ id: context.table_id });
          const fields = await table.getFields();
          const outcome_fields = fields
            .filter(f => ["Float", "Integer"].includes(f.type.name))
            .map(f => f.name);
          const factor_fields = fields
            .filter(f => ["String", "Bool", "Integer"].includes(f.type.name))
            .map(f => f.name);
          return new Form({
            fields: [
              {
                name: "outcome_field",
                label: "Outcome",
                type: "String",
                sublabel:
                  "Row count or field to sum up for total",
                required: true,
                attributes: {
                  options: ["Row count", ...outcome_fields].join()
                }
              },
              {
                name: "factor_field",
                label: "Factor",
                type: "String",
                sublabel:
                  "E.g the different wedges in a pie chart",
                required: true,
                attributes: {
                  options: factor_fields.join()
                }
              },
              {
                name: "style",
                label: "Style",
                type: "String",
                required: true,
                attributes: {
                  options: "Donut chart,Bar chart, Pie chart"
                }
              }
            ]
          });
        }
      }
    ]
  });
const run = async (
  table_id,
  viewname,
  {
    outcome_field,
    factor_field,
    style
  },
  state,
  extraArgs
) => {
  const table = await Table.findOne({ id: table_id });
  const fields = await table.getFields()
  const divid = `plot${Math.round(100000*Math.random())}`
  const outcome = outcome_field==="Row count" ? `COUNT(*)` : `SUM(${db.sqlsanitize(outcome_field)})`
  const sql = `select ${outcome}, ${db.sqlsanitize(factor_field)} from ${table.sql_name} group by ${db.sqlsanitize(factor_field)}`
  
  const {rows} = await db.query(sql)
  
  const data = [{
    type: "pie",
    values: rows.map(r=>r.count),
    labels: rows.map(r=>r[factor_field])
  }]

  var layout = {
    title: "A plot"
  };
  return div({id:divid})+script(domReady(plotly(divid, data, layout)))
}

const plotly=(id, ...args) => `Plotly.plot(document.getElementById("${id}"),${args.map(JSON.stringify).join()})`

const get_state_fields = async (table_id, viewname, { show_view }) => {
  const table_fields = await Field.find({ table_id });
  return table_fields.map(f => {
    const sf = new Field(f);
    sf.required = false;
    return sf;
  });
};


module.exports = {
  headers: [
    {
      script:
        "https://cdnjs.cloudflare.com/ajax/libs/plotly.js/1.54.5/plotly.min.js",
      integrity: "sha256-qXgZ3jy1txdNZG0Lv20X3u5yh4892KqFcfF1SaOW0gI="
    }
  ],
  sc_plugin_api_version: 1,
  viewtemplates: [
    {
      name: "ProportionsVis",
      display_state_form: false,
      get_state_fields,
      configuration_workflow,
      run
    }
  ]
};