export const MUSCLE_GROUPS = ['Грудь', 'Спина', 'Ноги', 'Плечи', 'Бицепс', 'Трицепс', 'Пресс', 'Кардио']

export interface LibraryExercise {
  name: string
  muscleGroup: string
}

export const EXERCISE_LIBRARY: LibraryExercise[] = [
  { name: 'Жим штанги лёжа', muscleGroup: 'Грудь' },
  { name: 'Жим гантелей лёжа', muscleGroup: 'Грудь' },
  { name: 'Жим на наклонной', muscleGroup: 'Грудь' },
  { name: 'Разводка гантелей', muscleGroup: 'Грудь' },
  { name: 'Отжимания на брусьях', muscleGroup: 'Грудь' },
  { name: 'Кроссовер', muscleGroup: 'Грудь' },
  { name: 'Подтягивания', muscleGroup: 'Спина' },
  { name: 'Тяга верхнего блока', muscleGroup: 'Спина' },
  { name: 'Тяга штанги в наклоне', muscleGroup: 'Спина' },
  { name: 'Тяга гантели в наклоне', muscleGroup: 'Спина' },
  { name: 'Горизонтальная тяга', muscleGroup: 'Спина' },
  { name: 'Становая тяга', muscleGroup: 'Спина' },
  { name: 'Гиперэкстензия', muscleGroup: 'Спина' },
  { name: 'Приседания со штангой', muscleGroup: 'Ноги' },
  { name: 'Жим ногами', muscleGroup: 'Ноги' },
  { name: 'Румынская тяга', muscleGroup: 'Ноги' },
  { name: 'Выпады', muscleGroup: 'Ноги' },
  { name: 'Сгибания ног', muscleGroup: 'Ноги' },
  { name: 'Разгибания ног', muscleGroup: 'Ноги' },
  { name: 'Подъём на носки', muscleGroup: 'Ноги' },
  { name: 'Жим штанги стоя', muscleGroup: 'Плечи' },
  { name: 'Жим гантелей сидя', muscleGroup: 'Плечи' },
  { name: 'Махи гантелями в стороны', muscleGroup: 'Плечи' },
  { name: 'Тяга к подбородку', muscleGroup: 'Плечи' },
  { name: 'Махи в наклоне', muscleGroup: 'Плечи' },
  { name: 'Подъём штанги на бицепс', muscleGroup: 'Бицепс' },
  { name: 'Подъём гантелей на бицепс', muscleGroup: 'Бицепс' },
  { name: 'Молотки', muscleGroup: 'Бицепс' },
  { name: 'Сгибания на скамье Скотта', muscleGroup: 'Бицепс' },
  { name: 'Французский жим', muscleGroup: 'Трицепс' },
  { name: 'Жим узким хватом', muscleGroup: 'Трицепс' },
  { name: 'Разгибания на блоке', muscleGroup: 'Трицепс' },
  { name: 'Отжимания от скамьи', muscleGroup: 'Трицепс' },
  { name: 'Скручивания', muscleGroup: 'Пресс' },
  { name: 'Планка', muscleGroup: 'Пресс' },
  { name: 'Подъём ног в висе', muscleGroup: 'Пресс' },
  { name: 'Бег', muscleGroup: 'Кардио' },
  { name: 'Велосипед', muscleGroup: 'Кардио' },
  { name: 'Гребля', muscleGroup: 'Кардио' },
  { name: 'Скакалка', muscleGroup: 'Кардио' },
]
