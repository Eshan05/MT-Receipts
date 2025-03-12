import mongoose, { Document, Schema, model, Model } from 'mongoose'

export interface ISequence extends Document {
  name: string
  value: number
}

interface ISequenceModel extends Model<ISequence> {
  getNext(name: string): Promise<number>
}

const sequenceSchema = new Schema<ISequence, ISequenceModel>({
  name: { type: String, required: true, unique: true },
  value: { type: Number, default: 1 },
})

sequenceSchema.statics.getNext = async function (
  name: string
): Promise<number> {
  const sequence = await this.findOneAndUpdate(
    { name },
    { $inc: { value: 1 } },
    { new: true, upsert: true }
  )
  return sequence.value
}

const Sequence: ISequenceModel =
  (mongoose.models.Sequence as ISequenceModel) ||
  model<ISequence, ISequenceModel>('Sequence', sequenceSchema)
export default Sequence
