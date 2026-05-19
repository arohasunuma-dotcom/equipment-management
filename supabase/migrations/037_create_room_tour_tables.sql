CREATE TABLE room_tour_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  company_name text NOT NULL,
  prefecture_code integer NOT NULL CHECK (prefecture_code BETWEEN 1 AND 47),
  address text,
  description text,
  thumbnail_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE room_tour_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid NOT NULL REFERENCES room_tour_models(id) ON DELETE CASCADE,
  url text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX room_tour_models_prefecture_idx ON room_tour_models(prefecture_code);
CREATE INDEX room_tour_media_model_idx ON room_tour_media(model_id);
